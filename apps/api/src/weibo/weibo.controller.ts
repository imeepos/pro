import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Sse,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboAuthService, WeiboLoginEvent } from './weibo-auth.service';
import { WeiboHealthCheckService } from './weibo-health-check.service';
import { JwtAuthGuard, JwtSseAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 微博控制器
 * 处理微博账号相关的 HTTP 请求
 */
@Controller('weibo')
export class WeiboController {
  constructor(
    private readonly weiboAccountService: WeiboAccountService,
    private readonly weiboAuthService: WeiboAuthService,
    private readonly healthCheckService: WeiboHealthCheckService,
  ) {}

  /**
   * 启动微博扫码登录
   * SSE 端点,实时推送登录状态变化
   *
   * GET /api/weibo/login/start?token=<token>
   * 注意: 由于 EventSource 不支持自定义 headers，token 通过 URL 参数传递
   *
   * SSE 事件类型:
   * - qrcode: 二维码生成
   * - scanned: 已扫码等待确认
   * - success: 登录成功
   * - expired: 二维码过期
   * - error: 错误
   */
  @Get('login/start')
  @UseGuards(JwtSseAuthGuard)
  @Sse()
  async startLogin(@Request() req): Promise<Observable<WeiboLoginEvent>> {
    const userId = req.user.userId;
    return this.weiboAuthService.startLogin(userId);
  }

  /**
   * 获取微博账号列表
   * GET /api/weibo/accounts
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getAccounts(@Request() req) {
    const userId = req.user.userId;
    return this.weiboAccountService.getAccounts(userId);
  }

  /**
   * 删除微博账号
   * DELETE /api/weibo/accounts/:id
   */
  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.userId;
    return this.weiboAccountService.deleteAccount(userId, id);
  }

  /**
   * 手动检查单个微博账号
   * POST /api/weibo/accounts/:id/check
   */
  @Post('accounts/:id/check')
  @UseGuards(JwtAuthGuard)
  async checkAccount(@Param('id', ParseIntPipe) id: number) {
    return this.healthCheckService.checkAccount(id);
  }

  /**
   * 批量检查所有活跃账号
   * POST /api/weibo/accounts/check-all
   */
  @Post('accounts/check-all')
  @UseGuards(JwtAuthGuard)
  async checkAllAccounts() {
    return this.healthCheckService.checkAllAccounts();
  }

  /**
   * 获取微博已登录用户统计
   * GET /api/weibo/logged-in-users/stats
   */
  @Get('logged-in-users/stats')
  @UseGuards(JwtAuthGuard)
  async getLoggedInUsersStats() {
    return this.weiboAccountService.getLoggedInUsersStats();
  }

  /**
   * 内部接口：获取包含cookies的微博账号列表
   * POST /api/internal/weibo/accounts/with-cookies
   * 供爬虫服务使用
   */
  @Post('internal/weibo/accounts/with-cookies')
  async getAccountsWithCookies(@Headers() headers) {
    // 验证内部服务调用
    const internalToken = headers['authorization']?.replace('Bearer ', '');
    const expectedToken = process.env.INTERNAL_API_TOKEN || 'internal-token';

    if (internalToken !== expectedToken) {
      throw new ForbiddenException('无权访问此接口');
    }

    return this.weiboAccountService.getAccountsWithCookies();
  }

  /**
   * 内部接口：标记账号为banned状态
   * POST /api/internal/weibo/accounts/:id/mark-banned
   * 供爬虫服务使用
   */
  @Post('internal/weibo/accounts/:id/mark-banned')
  async markAccountBanned(
    @Param('id', ParseIntPipe) id: number,
    @Headers() headers
  ) {
    // 验证内部服务调用
    const internalToken = headers['authorization']?.replace('Bearer ', '');
    const expectedToken = process.env.INTERNAL_API_TOKEN || 'internal-token';

    if (internalToken !== expectedToken) {
      throw new ForbiddenException('无权访问此接口');
    }

    return this.weiboAccountService.markAccountBanned(id);
  }
}

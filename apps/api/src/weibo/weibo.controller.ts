import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboAuthService, WeiboLoginEvent } from './weibo-auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 微博控制器
 * 处理微博账号相关的 HTTP 请求
 */
@Controller('weibo')
export class WeiboController {
  constructor(
    private readonly weiboAccountService: WeiboAccountService,
    private readonly weiboAuthService: WeiboAuthService,
  ) {}

  /**
   * 启动微博扫码登录
   * SSE 端点,实时推送登录状态变化
   *
   * GET /api/weibo/login/start
   * Headers: Authorization: Bearer <token>
   *
   * SSE 事件类型:
   * - qrcode: 二维码生成
   * - scanned: 已扫码等待确认
   * - success: 登录成功
   * - expired: 二维码过期
   * - error: 错误
   */
  @Get('login/start')
  @UseGuards(JwtAuthGuard)
  @Sse()
  async startLogin(@Request() req): Promise<Observable<WeiboLoginEvent>> {
    const userId = req.user.id;
    return this.weiboAuthService.startLogin(userId);
  }

  /**
   * 获取微博账号列表
   * GET /api/weibo/accounts
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getAccounts(@Request() req) {
    const userId = req.user.id;
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
    const userId = req.user.id;
    return this.weiboAccountService.deleteAccount(userId, id);
  }
}

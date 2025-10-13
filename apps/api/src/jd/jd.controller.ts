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
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JdAccountService } from './jd-account.service';
import { JdAuthService, JdLoginEvent } from './jd-auth.service';
import { JdHealthCheckService } from './jd-health-check.service';
import { JwtAuthGuard, JwtSseAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 京东控制器
 * 处理京东账号相关的 HTTP 请求
 */
@Controller('jd')
export class JdController {
  constructor(
    private readonly jdAccountService: JdAccountService,
    private readonly jdAuthService: JdAuthService,
    private readonly healthCheckService: JdHealthCheckService,
  ) {}

  /**
   * 启动京东扫码登录
   * SSE 端点,实时推送登录状态变化
   *
   * GET /api/jd/login/start?token=<token>
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
  async startLogin(@Request() req): Promise<Observable<MessageEvent>> {
    const userId = req.user.userId;
    const events$ = await this.jdAuthService.startLogin(userId);

    return events$.pipe(
      map((event: JdLoginEvent) => event as MessageEvent)
    );
  }

  /**
   * 获取京东账号列表
   * GET /api/jd/accounts
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getAccounts(@Request() req) {
    const userId = req.user.userId;
    return this.jdAccountService.getAccounts(userId);
  }

  /**
   * 删除京东账号
   * DELETE /api/jd/accounts/:id
   */
  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.userId;
    return this.jdAccountService.deleteAccount(userId, id);
  }

  /**
   * 手动检查单个京东账号
   * POST /api/jd/accounts/:id/check
   */
  @Post('accounts/:id/check')
  @UseGuards(JwtAuthGuard)
  async checkAccount(@Param('id', ParseIntPipe) id: number) {
    return this.healthCheckService.checkAccount(id);
  }

  /**
   * 批量检查所有活跃账号
   * POST /api/jd/accounts/check-all
   */
  @Post('accounts/check-all')
  @UseGuards(JwtAuthGuard)
  async checkAllAccounts() {
    return this.healthCheckService.checkAllAccounts();
  }

  /**
   * 获取京东已登录用户统计
   * GET /api/jd/logged-in-users/stats
   */
  @Get('logged-in-users/stats')
  @UseGuards(JwtAuthGuard)
  async getLoggedInUsersStats() {
    return this.jdAccountService.getLoggedInUsersStats();
  }
}
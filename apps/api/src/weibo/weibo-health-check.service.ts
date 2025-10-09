import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboAccountEntity, WeiboAccountStatus } from '../entities/weibo-account.entity';
import axios, { AxiosError } from 'axios';
import { ScreensGateway } from '../screens/screens.gateway';

/**
 * 账号检查结果接口
 */
export interface CheckResult {
  accountId: number;
  weiboUid: string;
  oldStatus: WeiboAccountStatus;
  newStatus: WeiboAccountStatus;
  statusChanged: boolean;
  message: string;
  checkedAt: Date;
}

/**
 * 批量检查汇总结果接口
 */
export interface CheckSummary {
  total: number;
  checked: number;
  statusChanged: number;
  active: number;
  expired: number;
  restricted: number;
  banned: number;
}

/**
 * Cookie 项接口
 */
interface CookieItem {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

/**
 * 微博账号健康检查服务
 * 使用 HTTP 请求检查微博账号的 Cookie 有效性和账号状态
 */
@Injectable()
export class WeiboHealthCheckService {
  private readonly logger = new Logger(WeiboHealthCheckService.name);

  // 微博关注列表接口（用于验证 Cookie 有效性）
  private readonly WEIBO_FRIENDS_API = 'https://weibo.com/ajax/friendships/friends';

  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
    @Inject(forwardRef(() => ScreensGateway))
    private readonly screensGateway: ScreensGateway,
  ) {}

  /**
   * 将 Cookie 数组转换为 Cookie 字符串
   * @param cookies Cookie 数组
   * @returns Cookie 字符串（格式：name1=value1; name2=value2）
   */
  private convertCookiesToString(cookies: CookieItem[]): string {
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  /**
   * 检查单个微博账号的健康状态
   * @param accountId 账号 ID
   * @returns 检查结果
   */
  async checkAccount(accountId: number): Promise<CheckResult> {
    this.logger.log(`开始检查账号: ${accountId}`);

    // 查询账号
    const account = await this.weiboAccountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`账号不存在: ${accountId}`);
    }

    const oldStatus = account.status;
    const checkedAt = new Date();

    try {
      // 解析 Cookie 数组
      const cookieArray: CookieItem[] = JSON.parse(account.cookies);
      const cookieString = this.convertCookiesToString(cookieArray);

      // 构建请求 URL
      const url = `${this.WEIBO_FRIENDS_API}?page=1&uid=${account.weiboUid}`;

      this.logger.debug(`请求微博接口: ${url}`);

      // 发送 HTTP 请求验证 Cookie
      const response = await axios.get(url, {
        headers: {
          accept: 'application/json, text/plain, */*',
          'client-version': 'v2.47.121',
          'x-requested-with': 'XMLHttpRequest',
          referer: `https://weibo.com/u/page/follow/${account.weiboUid}`,
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          cookie: cookieString,
        },
        timeout: 30000,
        validateStatus: (status) => status < 600, // 接受所有状态码，手动处理
      });

      const status = response.status;
      this.logger.debug(`账号 ${accountId} 响应状态: ${status}`);

      let newStatus: WeiboAccountStatus;
      let message: string;

      // 判断账号状态
      if (status === 401 || status === 403) {
        // Cookie 已过期或无权限
        newStatus = WeiboAccountStatus.EXPIRED;
        message = 'Cookie 已过期，需要重新登录';
        this.logger.warn(`账号 ${accountId} Cookie 已过期`);
      } else if (status === 429) {
        // 请求频率限制
        newStatus = WeiboAccountStatus.RESTRICTED;
        message = '账号触发频率限制，需要稍后重试';
        this.logger.warn(`账号 ${accountId} 触发频率限制`);
      } else if (status === 200) {
        // 解析响应数据
        try {
          const data = response.data;

          // 检查是否返回正常数据
          if (data.ok === 1) {
            // 账号正常
            newStatus = WeiboAccountStatus.ACTIVE;
            message = '账号状态正常';
            this.logger.log(`账号 ${accountId} 状态正常`);
          } else if (data.ok === 0) {
            // 检查错误码
            if (data.errno === '100005' || data.errno === '100006') {
              // Cookie 无效或已过期
              newStatus = WeiboAccountStatus.EXPIRED;
              message = `Cookie 无效: ${data.msg || '未知错误'}`;
              this.logger.warn(`账号 ${accountId} Cookie 无效: ${data.errno}`);
            } else if (data.errno === '100003') {
              // 需要验证码或风控
              newStatus = WeiboAccountStatus.RESTRICTED;
              message = `账号被风控: ${data.msg || '需要人工验证'}`;
              this.logger.warn(`账号 ${accountId} 触发风控: ${data.errno}`);
            } else {
              // 其他错误
              newStatus = WeiboAccountStatus.BANNED;
              message = `账号异常: ${data.msg || data.errno || '未知错误'}`;
              this.logger.warn(`账号 ${accountId} 响应异常: ${JSON.stringify(data)}`);
            }
          } else {
            // 响应格式异常
            newStatus = WeiboAccountStatus.BANNED;
            message = '账号响应格式异常';
            this.logger.warn(`账号 ${accountId} 响应格式异常: ${JSON.stringify(data)}`);
          }
        } catch (parseError) {
          // 无法解析响应数据
          newStatus = WeiboAccountStatus.BANNED;
          message = '账号响应数据无法解析';
          this.logger.error(`账号 ${accountId} 响应解析失败`, parseError);
        }
      } else {
        // 其他异常状态码
        newStatus = WeiboAccountStatus.BANNED;
        message = `账号异常，HTTP 状态码: ${status}`;
        this.logger.warn(`账号 ${accountId} 异常状态码: ${status}`);
      }

      // 更新账号状态
      const statusChanged = oldStatus !== newStatus;
      account.status = newStatus;
      account.lastCheckAt = checkedAt;
      await this.weiboAccountRepo.save(account);

      this.logger.log(
        `账号 ${accountId} 检查完成: ${oldStatus} -> ${newStatus}${statusChanged ? ' (状态已变更)' : ''}`,
      );

      // 如果状态发生变化，推送统计更新
      if (statusChanged) {
        await this.notifyWeiboStatsUpdate();
      }

      return {
        accountId: account.id,
        weiboUid: account.weiboUid,
        oldStatus,
        newStatus,
        statusChanged,
        message,
        checkedAt,
      };
    } catch (error) {
      // 处理请求异常
      let message = `检查失败: ${error.message}`;

      // 如果是 Axios 错误，提取更多信息
      if (error instanceof AxiosError) {
        if (error.response) {
          message = `请求失败: HTTP ${error.response.status}`;
          this.logger.error(`账号 ${accountId} 请求失败`, {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          message = '网络请求超时或无响应';
          this.logger.error(`账号 ${accountId} 网络请求失败`, error.message);
        }
      } else {
        this.logger.error(`检查账号 ${accountId} 时发生错误`, error);
      }

      // 更新检查时间但保持状态不变
      account.lastCheckAt = checkedAt;
      await this.weiboAccountRepo.save(account);

      return {
        accountId: account.id,
        weiboUid: account.weiboUid,
        oldStatus,
        newStatus: oldStatus,
        statusChanged: false,
        message,
        checkedAt,
      };
    }
  }

  /**
   * 批量检查所有 ACTIVE 状态的账号
   * @returns 检查汇总结果
   */
  async checkAllAccounts(): Promise<CheckSummary> {
    this.logger.log('开始批量检查所有活跃账号...');

    // 查询所有 ACTIVE 状态的账号
    const accounts = await this.weiboAccountRepo.find({
      where: { status: WeiboAccountStatus.ACTIVE },
    });

    const total = accounts.length;
    this.logger.log(`找到 ${total} 个活跃账号待检查`);

    const results: CheckResult[] = [];

    // 逐个检查账号
    for (const account of accounts) {
      try {
        const result = await this.checkAccount(account.id);
        results.push(result);

        // 延迟以避免请求过快
        await this.delay(2000);
      } catch (error) {
        this.logger.error(`检查账号 ${account.id} 失败`, error);
      }
    }

    // 统计结果
    const checked = results.length;
    const statusChanged = results.filter((r) => r.statusChanged).length;

    // 查询所有账号的最新状态统计
    const statusCounts = await this.weiboAccountRepo
      .createQueryBuilder('account')
      .select('account.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('account.status')
      .getRawMany();

    const summary: CheckSummary = {
      total,
      checked,
      statusChanged,
      active: 0,
      expired: 0,
      restricted: 0,
      banned: 0,
    };

    // 填充状态统计
    for (const item of statusCounts) {
      const count = parseInt(item.count, 10);
      switch (item.status) {
        case WeiboAccountStatus.ACTIVE:
          summary.active = count;
          break;
        case WeiboAccountStatus.EXPIRED:
          summary.expired = count;
          break;
        case WeiboAccountStatus.RESTRICTED:
          summary.restricted = count;
          break;
        case WeiboAccountStatus.BANNED:
          summary.banned = count;
          break;
      }
    }

    this.logger.log(`批量检查完成: ${JSON.stringify(summary)}`);
    return summary;
  }

  /**
   * 推送微博用户统计更新
   * 在账号状态变化时主动推送最新统计
   */
  private async notifyWeiboStatsUpdate() {
    try {
      // 获取微博用户统计
      const total = await this.weiboAccountRepo.count();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayNew = await this.weiboAccountRepo.count({
        where: {
          createdAt: {
            $gte: today,
          } as any,
        },
      });

      const online = await this.weiboAccountRepo.count({
        where: {
          status: WeiboAccountStatus.ACTIVE,
        },
      });

      const stats = { total, todayNew, online };
      this.screensGateway.broadcastWeiboLoggedInUsersUpdate(stats);
    } catch (error) {
      this.logger.error('推送微博用户统计更新失败:', error);
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

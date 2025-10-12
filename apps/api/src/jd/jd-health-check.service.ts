import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { JdAccountEntity, JdAccountStatus } from '@pro/entities';
import { JdAccountService } from './jd-account.service';

/**
 * 京东账号健康检查服务
 * 负责检查京东账号Cookie的有效性和状态
 */
@Injectable()
export class JdHealthCheckService {
  private readonly logger = new Logger(JdHealthCheckService.name);

  constructor(
    @InjectRepository(JdAccountEntity)
    private readonly jdAccountRepo: Repository<JdAccountEntity>,
    private readonly jdAccountService: JdAccountService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 检查单个账号的健康状态
   */
  async checkAccount(accountId: number) {
    const account = await this.jdAccountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('账号不存在');
    }

    const oldStatus = account.status;
    let newStatus = oldStatus;
    let message = '';

    try {
      // 解析Cookie
      const cookies = JSON.parse(account.cookies);

      // 检查Cookie是否有效
      const isValid = await this.checkCookieValidity(cookies);

      if (isValid) {
        newStatus = JdAccountStatus.ACTIVE;
        message = '账号状态正常';
      } else {
        newStatus = JdAccountStatus.EXPIRED;
        message = 'Cookie已失效，请重新登录';
      }

      // 更新账号状态
      if (oldStatus !== newStatus) {
        await this.jdAccountService.updateAccountStatus(accountId, newStatus);
        this.logger.log(`账号状态更新: ${account.jdUid} ${oldStatus} → ${newStatus}`);
      }

      return {
        accountId,
        jdUid: account.jdUid,
        oldStatus,
        newStatus,
        statusChanged: oldStatus !== newStatus,
        message,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`检查账号失败: ${account.jdUid}`, error);

      // 如果检查失败，标记为过期
      newStatus = JdAccountStatus.EXPIRED;
      if (oldStatus !== newStatus) {
        await this.jdAccountService.updateAccountStatus(accountId, newStatus);
      }

      return {
        accountId,
        jdUid: account.jdUid,
        oldStatus,
        newStatus,
        statusChanged: oldStatus !== newStatus,
        message: `检查失败: ${error.message}`,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 检查所有活跃账号的健康状态
   */
  async checkAllAccounts() {
    const activeAccounts = await this.jdAccountRepo.find({
      where: { status: JdAccountStatus.ACTIVE },
    });

    const results = [];

    for (const account of activeAccounts) {
      try {
        const result = await this.checkAccount(account.id);
        results.push(result);
      } catch (error) {
        this.logger.error(`检查账号失败: ${account.jdUid}`, error);
        results.push({
          accountId: account.id,
          jdUid: account.jdUid,
          oldStatus: account.status,
          newStatus: JdAccountStatus.EXPIRED,
          statusChanged: true,
          message: `检查失败: ${error.message}`,
          checkedAt: new Date().toISOString(),
        });
      }
    }

    return {
      total: activeAccounts.length,
      checked: results.length,
      results,
    };
  }

  /**
   * 检查Cookie的有效性
   */
  private async checkCookieValidity(cookies: any[]): Promise<boolean> {
    try {
      // 检查必要Cookie是否存在
      const requiredCookies = ['pt_pin', 'pt_key'];
      const hasRequiredCookies = requiredCookies.every(cookieName =>
        cookies.some(cookie => cookie.name === cookieName)
      );

      if (!hasRequiredCookies) {
        return false;
      }

      // 尝试访问京东个人主页验证Cookie
      const cookieHeader = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');

      const response = await this.httpService.axiosRef.get('https://i.jd.com/user/info', {
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      // 检查响应状态和内容
      return response.status === 200 && !response.data.includes('login');
    } catch (error) {
      this.logger.debug('Cookie验证失败', error.message);
      return false;
    }
  }
}
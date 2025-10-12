import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  WeiboAccountEntity,
  WeiboAccountStatus,
} from '@pro/entities';
import { LoggedInUsersStats } from '@pro/sdk';
import { ScreensGateway } from '../screens/screens.gateway';

/**
 * 微博账号管理服务
 * 负责微博账号的查询、删除等操作
 */
@Injectable()
export class WeiboAccountService {
  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepo: Repository<WeiboAccountEntity>,
    @Inject(forwardRef(() => ScreensGateway))
    private readonly screensGateway: ScreensGateway,
  ) {}

  /**
   * 获取用户的所有微博账号
   * 不返回敏感信息（如 cookies）
   */
  async getAccounts(userId: string) {
    const accounts = await this.weiboAccountRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        weiboUid: account.weiboUid,
        weiboNickname: account.weiboNickname,
        weiboAvatar: account.weiboAvatar,
        status: account.status,
        lastCheckAt: account.lastCheckAt,
        createdAt: account.createdAt,
      })),
    };
  }

  /**
   * 删除微博账号
   * 包含权限验证：只能删除自己的账号
   */
  async deleteAccount(userId: string, accountId: number) {
    const account = await this.weiboAccountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('账号不存在');
    }

    // 权限验证: 只能删除自己的账号
    if (account.userId !== userId) {
      throw new ForbiddenException('无权删除此账号');
    }

    await this.weiboAccountRepo.delete(accountId);

    // 推送微博用户统计更新
    await this.notifyWeiboStatsUpdate();

    return { success: true };
  }

  /**
   * 获取微博已登录用户统计
   * 返回总数、今日新增、在线用户数
   */
  async getLoggedInUsersStats() {
    // 总用户数
    const total = await this.weiboAccountRepo.count();

    // 今日新增（今天 00:00:00 之后创建的）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNew = await this.weiboAccountRepo.count({
      where: {
        createdAt: MoreThanOrEqual(today),
      },
    });

    // 在线用户数（状态为 ACTIVE 的账号）
    const online = await this.weiboAccountRepo.count({
      where: {
        status: WeiboAccountStatus.ACTIVE,
      },
    });

    return {
      total,
      todayNew,
      online,
    };
  }

  /**
   * 推送微博用户统计更新
   * 在账号数据变化时主动推送最新统计
   */
  private async notifyWeiboStatsUpdate() {
    try {
      const stats = await this.getLoggedInUsersStats();
      this.screensGateway.broadcastWeiboLoggedInUsersUpdate(stats);
    } catch (error) {
      console.error('推送微博用户统计更新失败:', error);
    }
  }

  /**
   * 内部接口：获取包含cookies的微博账号列表
   * 供爬虫服务使用
   */
  async getAccountsWithCookies() {
    const accounts = await this.weiboAccountRepo.find({
      where: { status: WeiboAccountStatus.ACTIVE },
      order: { lastCheckAt: 'ASC' }, // 优先使用最近检查过的账号
    });

    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        weiboUid: account.weiboUid,
        weiboNickname: account.weiboNickname,
        status: account.status,
        cookies: account.cookies, // 包含敏感的cookies信息
        lastCheckAt: account.lastCheckAt,
      })),
    };
  }

  /**
   * 内部接口：标记账号为banned状态
   * 供爬虫服务使用
   */
  async markAccountBanned(accountId: number) {
    const account = await this.weiboAccountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('账号不存在');
    }

    // 更新账号状态为banned
    account.status = WeiboAccountStatus.BANNED;
    await this.weiboAccountRepo.save(account);

    // 推送统计更新
    await this.notifyWeiboStatsUpdate();

    return { success: true, message: '账号已标记为banned状态' };
  }
}

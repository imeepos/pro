import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  JdAccountEntity,
  JdAccountStatus,
} from '../entities/jd-account.entity';

/**
 * 京东账号管理服务
 * 负责京东账号的查询、删除等操作
 */
@Injectable()
export class JdAccountService {
  constructor(
    @InjectRepository(JdAccountEntity)
    private readonly jdAccountRepo: Repository<JdAccountEntity>,
  ) {}

  /**
   * 获取用户的所有京东账号
   * 不返回敏感信息（如 cookies）
   */
  async getAccounts(userId: string) {
    const accounts = await this.jdAccountRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        jdUid: account.jdUid,
        jdNickname: account.jdNickname,
        jdAvatar: account.jdAvatar,
        status: account.status,
        lastCheckAt: account.lastCheckAt,
        createdAt: account.createdAt,
      })),
    };
  }

  /**
   * 删除京东账号
   * 包含权限验证：只能删除自己的账号
   */
  async deleteAccount(userId: string, accountId: number) {
    const account = await this.jdAccountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('账号不存在');
    }

    // 权限验证: 只能删除自己的账号
    if (account.userId !== userId) {
      throw new ForbiddenException('无权删除此账号');
    }

    await this.jdAccountRepo.delete(accountId);

    return { success: true };
  }

  /**
   * 保存京东账号
   */
  async saveAccount(userId: string, cookies: string, userInfo: {
    uid: string;
    nickname?: string;
    avatar?: string;
  }) {
    // 检查是否已存在相同的账号绑定
    const existingAccount = await this.jdAccountRepo.findOne({
      where: { userId, jdUid: userInfo.uid },
    });

    if (existingAccount) {
      // 更新现有账号的Cookie和信息
      existingAccount.cookies = cookies;
      existingAccount.jdNickname = userInfo.nickname || existingAccount.jdNickname;
      existingAccount.jdAvatar = userInfo.avatar || existingAccount.jdAvatar;
      existingAccount.status = JdAccountStatus.ACTIVE;
      existingAccount.lastCheckAt = new Date();

      return await this.jdAccountRepo.save(existingAccount);
    }

    // 创建新账号记录
    const account = this.jdAccountRepo.create({
      userId,
      jdUid: userInfo.uid,
      jdNickname: userInfo.nickname,
      jdAvatar: userInfo.avatar,
      cookies,
      status: JdAccountStatus.ACTIVE,
    });

    return await this.jdAccountRepo.save(account);
  }

  /**
   * 获取京东已登录用户统计
   * 返回总数、今日新增、在线用户数
   */
  async getLoggedInUsersStats() {
    // 总用户数
    const total = await this.jdAccountRepo.count();

    // 今日新增（今天 00:00:00 之后创建的）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNew = await this.jdAccountRepo.count({
      where: {
        createdAt: MoreThanOrEqual(today),
      },
    });

    // 在线用户数（状态为 ACTIVE 的账号）
    const online = await this.jdAccountRepo.count({
      where: {
        status: JdAccountStatus.ACTIVE,
      },
    });

    return {
      total,
      todayNew,
      online,
    };
  }

  /**
   * 更新账号状态
   */
  async updateAccountStatus(accountId: number, status: JdAccountStatus) {
    await this.jdAccountRepo.update(accountId, {
      status,
      lastCheckAt: new Date(),
    });
  }

  /**
   * 根据ID获取账号信息（包含敏感信息）
   */
  async getAccountById(accountId: number): Promise<JdAccountEntity | null> {
    return await this.jdAccountRepo.findOne({
      where: { id: accountId },
    });
  }
}
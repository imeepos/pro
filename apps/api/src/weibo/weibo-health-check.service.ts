import { Injectable, Logger } from '@nestjs/common';
import { MoreThanOrEqual } from 'typeorm';
import { WeiboAccountEntity, WeiboAccountStatus, useEntityManager } from '@pro/entities';
import {
  WeiboHealthCheckService as WeiboCoreHealthCheckService,
  type WeiboAccountHealthResult,
} from '@pro/weibo';
import { PubSubService } from '../common/pubsub/pubsub.service';
import { SUBSCRIPTION_EVENTS } from '../screens/constants/subscription-events';
import { root } from '@pro/core';

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
 * 微博账号健康检查服务
 * 聚焦于数据库状态同步与事件通知
 * 具体的 HTTP 验证逻辑委托给 @pro/weibo 包
 */
@Injectable()
export class WeiboHealthCheckService {
  private readonly logger = new Logger(WeiboHealthCheckService.name);
  private readonly weiboHealthInspector: WeiboCoreHealthCheckService;
  constructor(
    private readonly pubSub: PubSubService,
  ) {
    this.weiboHealthInspector = root.get(WeiboCoreHealthCheckService)
  }

  /**
   * 检查单个微博账号的健康状态
   */
  async checkAccount(accountId: number): Promise<CheckResult> {
    this.logger.log(`开始检查账号: ${accountId}`);

    return useEntityManager(async (m) => {
      const repo = m.getRepository(WeiboAccountEntity);

      const account = await repo.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`账号不存在: ${accountId}`);
      }

      const oldStatus = account.status;

      try {
        const health = await this.weiboHealthInspector.checkAccountHealth(account.id, account.cookies, {
          weiboUid: account.weiboUid,
        });

        const transition = this.resolveStatusTransition(oldStatus, health);

        account.status = transition.persistedStatus;
        account.lastCheckAt = health.checkedAt;
        await repo.save(account);

        if (transition.statusChanged) {
          await this.notifyWeiboStatsUpdate();
        }

        this.logger.log(
          `账号 ${accountId} 检查完成: ${oldStatus} -> ${transition.persistedStatus}` +
          `${transition.statusChanged ? ' (状态已变更)' : ''}`,
        );

        return {
          accountId: account.id,
          weiboUid: account.weiboUid,
          oldStatus,
          newStatus: transition.persistedStatus,
          statusChanged: transition.statusChanged,
          message: transition.message,
          checkedAt: health.checkedAt,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        this.logger.error(`检查账号 ${accountId} 时发生未预期错误`, error);

        account.lastCheckAt = new Date();
        await repo.save(account);

        return {
          accountId: account.id,
          weiboUid: account.weiboUid,
          oldStatus,
          newStatus: oldStatus,
          statusChanged: false,
          message: `检查失败: ${message}`,
          checkedAt: account.lastCheckAt,
        };
      }
    });
  }

  /**
   * 批量检查所有 ACTIVE 状态的账号
   */
  async checkAllAccounts(): Promise<CheckSummary> {
    this.logger.log('开始批量检查所有活跃账号...');

    const accounts = await useEntityManager(async (m) => {
      return m.getRepository(WeiboAccountEntity).find({
        where: { status: WeiboAccountStatus.ACTIVE },
      });
    });

    const total = accounts.length;
    this.logger.log(`找到 ${total} 个活跃账号待检查`);

    const results: CheckResult[] = [];

    for (const account of accounts) {
      try {
        const result = await this.checkAccount(account.id);
        results.push(result);

        await this.delay(2000);
      } catch (error) {
        this.logger.error(`检查账号 ${account.id} 失败`, error);
      }
    }

    const checked = results.length;
    const statusChanged = results.filter((r) => r.statusChanged).length;

    const statusCounts = await useEntityManager(async (m) => {
      return m
        .getRepository(WeiboAccountEntity)
        .createQueryBuilder('account')
        .select('account.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('account.status')
        .getRawMany();
    });

    const summary: CheckSummary = {
      total,
      checked,
      statusChanged,
      active: 0,
      expired: 0,
      restricted: 0,
      banned: 0,
    };

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

  private resolveStatusTransition(
    previousStatus: WeiboAccountStatus,
    result: WeiboAccountHealthResult,
  ): {
    persistedStatus: WeiboAccountStatus;
    statusChanged: boolean;
    message: string;
  } {
    const preserve = this.shouldPreserveStatus(result.errorType);
    const persistedStatus = preserve ? previousStatus : result.status;
    const statusChanged = persistedStatus !== previousStatus;
    const message = this.describeResult(result, persistedStatus, preserve);

    return { persistedStatus, statusChanged, message };
  }

  private shouldPreserveStatus(errorType?: string): boolean {
    if (!errorType) {
      return false;
    }

    return ['NETWORK_ERROR', 'TIMEOUT', 'UNKNOWN_ERROR'].includes(errorType);
  }

  private describeResult(
    result: WeiboAccountHealthResult,
    effectiveStatus: WeiboAccountStatus,
    preserved: boolean,
  ): string {
    if (effectiveStatus === WeiboAccountStatus.ACTIVE) {
      return '账号状态正常';
    }

    if (preserved) {
      return result.errorMessage ?? '检查过程中出现临时性问题';
    }

    const detail = result.errorMessage;

    switch (effectiveStatus) {
      case WeiboAccountStatus.EXPIRED:
        return detail ?? 'Cookie 已过期，需要重新登录';
      case WeiboAccountStatus.RESTRICTED:
        return detail ?? '账号触发风控限制，需要人工验证';
      case WeiboAccountStatus.BANNED:
        return detail ?? '账号异常，请人工介入核查';
      default:
        return detail ?? '账号状态更新完成';
    }
  }

  /**
   * 推送微博用户统计更新
   * 在账号状态变化时主动推送最新统计
   */
  private async notifyWeiboStatsUpdate() {
    try {
      const stats = await useEntityManager(async (m) => {
        const repo = m.getRepository(WeiboAccountEntity);

        const total = await repo.count();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayNew = await repo.count({
          where: {
            createdAt: MoreThanOrEqual(today),
          },
        });

        const online = await repo.count({
          where: {
            status: WeiboAccountStatus.ACTIVE,
          },
        });

        return { total, todayNew, online };
      });

      await this.pubSub.publish(SUBSCRIPTION_EVENTS.WEIBO_LOGGED_IN_USERS_UPDATE, stats);
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


import { Injectable, Logger } from '@nestjs/common';
import type {
  WeiboAccount,
  RotationStrategy,
  CookieValidationResult,
  AccountHealthCheckResult,
} from './account.service';

interface HealthEvaluationContext {
  rotationStrategy: RotationStrategy;
  validateCookie: (account: WeiboAccount) => Promise<CookieValidationResult>;
}

@Injectable()
export class WeiboAccountHealthMonitor {
  private readonly logger = new Logger(WeiboAccountHealthMonitor.name);

  async evaluate(
    account: WeiboAccount,
    context: HealthEvaluationContext,
  ): Promise<AccountHealthCheckResult> {
    const { rotationStrategy, validateCookie } = context;
    const healthCheckStartTime = Date.now();

    const result: AccountHealthCheckResult = {
      accountId: account.id,
      isHealthy: true,
      healthScore: 100,
      issues: [],
      recommendations: [],
      validationDetails: {
        cookieStatus: 'valid',
        lastCheckTime: new Date(),
        responseTime: 0,
        consecutiveFailures: account.consecutiveFailures,
        bannedRiskLevel: account.bannedRiskLevel,
      },
    };

    const cookieValidation = await validateCookie(account);
    result.validationDetails.responseTime = cookieValidation.responseTime;

    if (!cookieValidation.isValid) {
      result.isHealthy = false;
      result.healthScore -= 40;
      result.issues.push(`Cookie验证失败: ${cookieValidation.errorMessage || '未知错误'}`);
      result.recommendations.push('更新账号Cookie或重新登录');

      if (cookieValidation.errorType === 'expired_cookies') {
        result.validationDetails.cookieStatus = 'expired';
      } else if (cookieValidation.errorType === 'missing_cookies') {
        result.validationDetails.cookieStatus = 'missing';
      } else {
        result.validationDetails.cookieStatus = 'invalid';
      }
    }

    if (account.consecutiveFailures > 0) {
      const penalty = -5 * account.consecutiveFailures;
      result.healthScore += penalty;
      result.issues.push(`连续失败 ${account.consecutiveFailures} 次，惩罚 ${penalty} 分`);

      if (account.consecutiveFailures > rotationStrategy.maxConsecutiveFailures) {
        result.isHealthy = false;
        result.recommendations.push('暂时停用此账号，检查问题原因');
      }
    }

    if (cookieValidation.responseTime > 8000) {
      result.isHealthy = false;
      result.healthScore -= 20;
      result.issues.push(`响应时间过长: ${cookieValidation.responseTime}ms`);
      result.recommendations.push('检查网络连接或更换账号');
    }

    if (account.bannedRiskLevel === 'high' || account.bannedRiskLevel === 'critical') {
      result.isHealthy = false;
      result.healthScore -= account.bannedRiskLevel === 'critical' ? 50 : 30;
      result.issues.push(`账号封禁风险: ${account.bannedRiskLevel}`);
      result.recommendations.push('降低此账号使用频率或暂停使用');
    }

    if (account.usageCount > 500) {
      result.healthScore -= 10;
      result.issues.push('使用频率过高，可能影响账号安全');
      result.recommendations.push('增加更多账号进行负载均衡');
    }

    result.healthScore = Math.max(0, Math.min(100, result.healthScore));

    const healthCheckDuration = Date.now() - healthCheckStartTime;

    this.logger.debug('账号健康检查完成', {
      accountId: account.id,
      nickname: account.nickname,
      isHealthy: result.isHealthy,
      healthScore: result.healthScore,
      issuesCount: result.issues.length,
      checkDuration: healthCheckDuration,
      responseTime: cookieValidation.responseTime,
    });

    return result;
  }
}

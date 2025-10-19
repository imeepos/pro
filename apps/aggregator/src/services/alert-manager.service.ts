import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@pro/logger';
import { ConfigurationService } from '@pro/configuration';
import {
  AlertEvent,
  MetricThreshold,
  MetricCategory,
} from '../types/metrics.types';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  enabled: boolean;
  threshold: MetricThreshold;
  cooldownMs: number;
  escalationLevels: EscalationLevel[];
  createdAt: Date;
  updatedAt: Date;
}

interface EscalationLevel {
  level: number;
  delayMs: number;
  channels: AlertChannel[];
  condition: 'consecutive' | 'frequency';
  count: number;
}

interface AlertChannel {
  type: 'log' | 'webhook' | 'email' | 'slack';
  config: Record<string, any>;
  enabled: boolean;
}

interface AlertState {
  alertId: string;
  ruleId: string;
  firstTriggered: Date;
  lastTriggered: Date;
  triggerCount: number;
  currentLevel: number;
  acknowledged: boolean;
  resolved: boolean;
}

@Injectable()
export class AlertManagerService implements OnModuleInit, OnModuleDestroy {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertState> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: Logger,
    private readonly configuration: ConfigurationService,
  ) {}

  async onModuleInit() {
    await this.loadDefaultRules();
    this.setupConfigurationWatchers();
    this.logger.log('告警管理服务启动，守护系统安全', 'AlertManagerService');
  }

  async onModuleDestroy() {
    this.clearAllTimers();
    this.logger.log('告警管理服务优雅停止', 'AlertManagerService');
  }

  /**
   * 监听指标告警事件
   */
  @OnEvent('metric.alert')
  async handleMetricAlert(alert: AlertEvent): Promise<void> {
    const rule = this.findRuleByMetricName(alert.metricName);
    if (!rule || !rule.enabled) {
      return;
    }

    // 检查冷却期
    if (this.isInCooldown(rule.id)) {
      this.logger.debug(`告警 ${rule.name} 在冷却期内，跳过处理`);
      return;
    }

    await this.processAlert(alert, rule);
  }

  /**
   * 创建告警规则
   */
  createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateRuleId();
    const now = new Date();

    const alertRule: AlertRule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.rules.set(id, alertRule);
    this.logger.log(`创建告警规则: ${rule.name}`, { id, category: rule.category });

    return id;
  }

  /**
   * 更新告警规则
   */
  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(id);
    if (!rule) {
      this.logger.warn(`告警规则不存在: ${id}`);
      return false;
    }

    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      id, // 确保 ID 不被覆盖
      updatedAt: new Date(),
    };

    this.rules.set(id, updatedRule);
    this.logger.log(`更新告警规则: ${rule.name}`, { id });

    return true;
  }

  /**
   * 删除告警规则
   */
  deleteRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) {
      return false;
    }

    this.rules.delete(id);
    this.clearRuleTimers(id);
    this.logger.log(`删除告警规则: ${rule.name}`, { id });

    return true;
  }

  /**
   * 启用/禁用告警规则
   */
  toggleRule(id: string, enabled: boolean): boolean {
    const rule = this.rules.get(id);
    if (!rule) {
      return false;
    }

    rule.enabled = enabled;
    rule.updatedAt = new Date();

    if (!enabled) {
      this.clearRuleTimers(id);
    }

    this.logger.log(`${enabled ? '启用' : '禁用'}告警规则: ${rule.name}`, { id });
    return true;
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alertState = this.activeAlerts.get(alertId);
    if (!alertState) {
      return false;
    }

    alertState.acknowledged = true;
    this.clearEscalationTimer(alertId);

    this.logger.log(`告警已确认: ${alertId}`, { userId, alertState });
    return true;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string, userId?: string): boolean {
    const alertState = this.activeAlerts.get(alertId);
    if (!alertState) {
      return false;
    }

    alertState.resolved = true;
    alertState.acknowledged = true;
    this.clearEscalationTimer(alertId);

    this.logger.log(`告警已解决: ${alertId}`, { userId, alertState });
    return true;
  }

  /**
   * 获取所有告警规则
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertState[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved);
  }

  /**
   * 获取告警统计
   */
  getAlertStatistics(): {
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
  } {
    const totalRules = this.rules.size;
    const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled).length;
    const allAlerts = Array.from(this.activeAlerts.values());

    return {
      totalRules,
      enabledRules,
      activeAlerts: allAlerts.filter(a => !a.resolved).length,
      acknowledgedAlerts: allAlerts.filter(a => a.acknowledged && !a.resolved).length,
      resolvedAlerts: allAlerts.filter(a => a.resolved).length,
    };
  }

  private async processAlert(alert: AlertEvent, rule: AlertRule): Promise<void> {
    const existingAlert = this.findActiveAlert(rule.id, alert.metricName);

    if (existingAlert) {
      await this.updateExistingAlert(existingAlert, alert, rule);
    } else {
      await this.createNewAlert(alert, rule);
    }
  }

  private async createNewAlert(alert: AlertEvent, rule: AlertRule): Promise<void> {
    const alertId = this.generateAlertId();
    const now = new Date();

    const alertState: AlertState = {
      alertId,
      ruleId: rule.id,
      firstTriggered: now,
      lastTriggered: now,
      triggerCount: 1,
      currentLevel: 0,
      acknowledged: false,
      resolved: false,
    };

    this.activeAlerts.set(alertId, alertState);
    this.setCooldown(rule.id, rule.cooldownMs);

    await this.sendAlert(alert, rule, alertState, 0);
    this.scheduleEscalation(alertId, rule, alertState);

    this.logger.warn(`新告警触发: ${rule.name}`, {
      alertId,
      metric: alert.metricName,
      value: alert.currentValue,
      threshold: alert.threshold,
    });
  }

  private async updateExistingAlert(
    alertState: AlertState,
    alert: AlertEvent,
    rule: AlertRule,
  ): Promise<void> {
    alertState.lastTriggered = new Date();
    alertState.triggerCount++;

    const shouldEscalate = this.shouldEscalate(alertState, rule);
    if (shouldEscalate && !alertState.acknowledged) {
      alertState.currentLevel++;
      await this.sendAlert(alert, rule, alertState, alertState.currentLevel);
      this.scheduleEscalation(alertState.alertId, rule, alertState);

      this.logger.warn(`告警升级: ${rule.name}`, {
        alertId: alertState.alertId,
        level: alertState.currentLevel,
        triggerCount: alertState.triggerCount,
      });
    }
  }

  private shouldEscalate(alertState: AlertState, rule: AlertRule): boolean {
    const nextLevel = alertState.currentLevel + 1;
    if (nextLevel >= rule.escalationLevels.length) {
      return false;
    }

    const escalationLevel = rule.escalationLevels[nextLevel];
    const timeSinceFirst = Date.now() - alertState.firstTriggered.getTime();

    switch (escalationLevel.condition) {
      case 'consecutive':
        return alertState.triggerCount >= escalationLevel.count;
      case 'frequency':
        return (
          timeSinceFirst >= escalationLevel.delayMs &&
          alertState.triggerCount >= escalationLevel.count
        );
      default:
        return false;
    }
  }

  private async sendAlert(
    alert: AlertEvent,
    rule: AlertRule,
    alertState: AlertState,
    level: number,
  ): Promise<void> {
    const escalationLevel = rule.escalationLevels[level];
    if (!escalationLevel) return;

    for (const channel of escalationLevel.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, alert, rule, alertState, level);
      } catch (error) {
        this.logger.error(`发送告警到通道 ${channel.type} 失败`, error);
      }
    }
  }

  private async sendToChannel(
    channel: AlertChannel,
    alert: AlertEvent,
    rule: AlertRule,
    alertState: AlertState,
    level: number,
  ): Promise<void> {
    const context = {
      alert,
      rule,
      alertState,
      level,
      timestamp: new Date().toISOString(),
    };

    switch (channel.type) {
      case 'log':
        this.logger.error(`[告警] ${rule.name}`, context);
        break;

      case 'webhook':
        await this.sendWebhook(channel.config, context);
        break;

      case 'email':
        await this.sendEmail(channel.config, context);
        break;

      case 'slack':
        await this.sendSlack(channel.config, context);
        break;

      default:
        this.logger.warn(`未知告警通道类型: ${channel.type}`);
    }
  }

  private async sendWebhook(config: any, context: any): Promise<void> {
    // 实现 Webhook 发送逻辑
    this.logger.debug('发送 Webhook 告警', { url: config.url, context });
  }

  private async sendEmail(config: any, context: any): Promise<void> {
    // 实现邮件发送逻辑
    this.logger.debug('发送邮件告警', { to: config.to, context });
  }

  private async sendSlack(config: any, context: any): Promise<void> {
    // 实现 Slack 发送逻辑
    this.logger.debug('发送 Slack 告警', { channel: config.channel, context });
  }

  private scheduleEscalation(
    alertId: string,
    rule: AlertRule,
    alertState: AlertState,
  ): void {
    this.clearEscalationTimer(alertId);

    const nextLevel = alertState.currentLevel + 1;
    if (nextLevel >= rule.escalationLevels.length) {
      return;
    }

    const escalationLevel = rule.escalationLevels[nextLevel];
    const timer = setTimeout(() => {
      if (!alertState.acknowledged && !alertState.resolved) {
        // 检查是否满足升级条件
        this.logger.debug(`检查告警升级条件: ${alertId}`);
      }
    }, escalationLevel.delayMs);

    this.escalationTimers.set(alertId, timer);
  }

  private clearEscalationTimer(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  private clearRuleTimers(ruleId: string): void {
    for (const [alertId, alertState] of this.activeAlerts) {
      if (alertState.ruleId === ruleId) {
        this.clearEscalationTimer(alertId);
      }
    }
  }

  private clearAllTimers(): void {
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
  }

  private findRuleByMetricName(metricName: string): AlertRule | null {
    for (const rule of this.rules.values()) {
      if (rule.threshold.metricName === metricName) {
        return rule;
      }
    }
    return null;
  }

  private findActiveAlert(ruleId: string, metricName: string): AlertState | null {
    for (const alertState of this.activeAlerts.values()) {
      if (alertState.ruleId === ruleId && !alertState.resolved) {
        return alertState;
      }
    }
    return null;
  }

  private isInCooldown(ruleId: string): boolean {
    const cooldownEnd = this.cooldowns.get(ruleId);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  private setCooldown(ruleId: string, cooldownMs: number): void {
    this.cooldowns.set(ruleId, Date.now() + cooldownMs);
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadDefaultRules(): Promise<void> {
    // 加载默认告警规则
    const defaultRules = [
      {
        name: '缓存命中率告警',
        description: '当缓存命中率低于阈值时触发',
        category: MetricCategory.PERFORMANCE,
        enabled: true,
        threshold: {
          metricName: 'cache_hit_rate',
          warning: 70,
          critical: 50,
          unit: '%',
          comparison: 'lt' as const,
        },
        cooldownMs: 300000, // 5分钟
        escalationLevels: [
          {
            level: 0,
            delayMs: 0,
            channels: [{ type: 'log' as const, config: {}, enabled: true }],
            condition: 'consecutive' as const,
            count: 1,
          },
        ],
      },
      {
        name: '响应时间告警',
        description: '当API响应时间超过阈值时触发',
        category: MetricCategory.EXPERIENCE,
        enabled: true,
        threshold: {
          metricName: 'api_response_time_p95',
          warning: 1000,
          critical: 3000,
          unit: 'ms',
          comparison: 'gt' as const,
        },
        cooldownMs: 600000, // 10分钟
        escalationLevels: [
          {
            level: 0,
            delayMs: 0,
            channels: [{ type: 'log' as const, config: {}, enabled: true }],
            condition: 'consecutive' as const,
            count: 3,
          },
        ],
      },
    ];

    for (const rule of defaultRules) {
      this.createRule(rule);
    }

    this.logger.log(`加载 ${defaultRules.length} 个默认告警规则`);
  }

  private setupConfigurationWatchers(): void {
    // 监听配置变化
    this.configuration.watch('alerts.enabled', (enabled) => {
      this.logger.log(`告警系统${enabled ? '启用' : '禁用'}`);
    });
  }
}
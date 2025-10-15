import { Injectable, Logger } from '@nestjs/common';
import { BugEntity } from '@pro/entities';
import { Bug } from '@pro/types';

@Injectable()
export class BugNotificationService {
  private readonly logger = new Logger(BugNotificationService.name);

  async notifyBugCreated(bug: BugEntity): Promise<void> {
    this.logger.log(`通知Bug创建: ${bug.id} - ${bug.title}`);

    console.log(`🐛 新Bug创建通知:`);
    console.log(`   标题: ${bug.title}`);
    console.log(`   优先级: ${bug.priority}`);
    console.log(`   报告者: ${bug.reporterId}`);
    console.log(`   时间: ${new Date().toLocaleString()}`);

    await this.sendNotification({
      type: 'BUG_CREATED',
      bugId: bug.id,
      title: '新Bug报告',
      message: `Bug "${bug.title}" 已被创建`,
      recipients: [bug.reporterId, bug.assigneeId].filter(Boolean),
    });
  }

  async notifyStatusChange(bug: BugEntity, oldStatus: string, newStatus: string): Promise<void> {
    this.logger.log(`通知Bug状态变更: ${bug.id} ${oldStatus} -> ${newStatus}`);

    console.log(`🔄 Bug状态变更通知:`);
    console.log(`   Bug: ${bug.title}`);
    console.log(`   状态: ${oldStatus} -> ${newStatus}`);
    console.log(`   时间: ${new Date().toLocaleString()}`);

    await this.sendNotification({
      type: 'BUG_STATUS_CHANGED',
      bugId: bug.id,
      title: 'Bug状态更新',
      message: `Bug "${bug.title}" 状态从 ${oldStatus} 变更为 ${newStatus}`,
      recipients: [bug.reporterId, bug.assigneeId].filter(Boolean),
    });
  }

  async notifyBugAssigned(bug: Bug, assigneeId: string): Promise<void> {
    this.logger.log(`通知Bug分配: ${bug.id} -> ${assigneeId}`);

    console.log(`👤 Bug分配通知:`);
    console.log(`   Bug: ${bug.title}`);
    console.log(`   分配给: ${assigneeId}`);
    console.log(`   时间: ${new Date().toLocaleString()}`);

    await this.sendNotification({
      type: 'BUG_ASSIGNED',
      bugId: bug.id,
      title: 'Bug已分配',
      message: `Bug "${bug.title}" 已分配给您`,
      recipients: [assigneeId],
    });
  }

  async notifyCommentAdded(bugId: string, commentAuthor: string, bugTitle: string): Promise<void> {
    this.logger.log(`通知新评论: Bug ${bugId} by ${commentAuthor}`);

    console.log(`💬 新评论通知:`);
    console.log(`   Bug: ${bugTitle}`);
    console.log(`   评论者: ${commentAuthor}`);
    console.log(`   时间: ${new Date().toLocaleString()}`);

    await this.sendNotification({
      type: 'COMMENT_ADDED',
      bugId: bugId,
      title: '新评论',
      message: `Bug "${bugTitle}" 收到新评论`,
      recipients: [commentAuthor],
    });
  }

  private async sendNotification(notification: {
    type: string;
    bugId: string;
    title: string;
    message: string;
    recipients: string[];
  }): Promise<void> {
    this.logger.log(`发送通知: ${notification.type} to ${notification.recipients.join(', ')}`);

    console.log(`📧 通知发送:`);
    console.log(`   类型: ${notification.type}`);
    console.log(`   标题: ${notification.title}`);
    console.log(`   消息: ${notification.message}`);
    console.log(`   接收者: ${notification.recipients.join(', ')}`);

    return Promise.resolve();
  }
}
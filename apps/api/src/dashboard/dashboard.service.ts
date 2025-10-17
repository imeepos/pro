import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScreenPageEntity, EventEntity, WeiboAccountEntity, WeiboSearchTaskEntity, EventStatus } from '@pro/entities';
import { DashboardStats, RecentActivity } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ScreenPageEntity)
    private readonly screenRepository: Repository<ScreenPageEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(WeiboAccountEntity)
    private readonly weiboAccountRepository: Repository<WeiboAccountEntity>,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly weiboSearchTaskRepository: Repository<WeiboSearchTaskEntity>,
  ) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const [totalScreens, totalEvents, totalWeiboAccounts, totalSearchTasks] = await Promise.all([
      this.screenRepository.count({ where: { createdBy: userId } }),
      this.eventRepository.count({ where: { createdBy: userId } }),
      this.weiboAccountRepository.count({ where: { userId } }),
      this.weiboSearchTaskRepository.count({ where: { userId } }),
    ]);

    return {
      totalScreens,
      totalEvents,
      totalWeiboAccounts,
      totalSearchTasks,
    };
  }

  async getRecentActivities(userId: string): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    const [recentScreens, recentEvents, recentWeiboAccounts, recentTasks] = await Promise.all([
      this.screenRepository.find({
        where: { createdBy: userId },
        order: { updatedAt: 'DESC' },
        take: 3,
      }),
      this.eventRepository.find({
        where: { createdBy: userId },
        order: { updatedAt: 'DESC' },
        take: 3,
      }),
      this.weiboAccountRepository.find({
        where: { userId },
        order: { updatedAt: 'DESC' },
        take: 2,
      }),
      this.weiboSearchTaskRepository.find({
        where: { userId },
        order: { updatedAt: 'DESC' },
        take: 2,
      }),
    ]);

    recentScreens.forEach(screen => {
      activities.push({
        type: 'screen',
        message: `${screen.status === 'published' ? '发布了' : '更新了'}大屏 "${screen.name}"`,
        time: this.formatTime(screen.updatedAt),
        entityId: screen.id,
      });
    });

    recentEvents.forEach(event => {
      activities.push({
        type: 'event',
        message: `${event.status === EventStatus.PUBLISHED ? '发布了' : '更新了'}事件 "${event.eventName}"`,
        time: this.formatTime(event.updatedAt),
        entityId: event.id,
      });
    });

    recentWeiboAccounts.forEach(account => {
      activities.push({
        type: 'weibo',
        message: `更新了微博账号 "${account.weiboNickname || account.weiboUid}"`,
        time: this.formatTime(account.updatedAt),
        entityId: account.id.toString(),
      });
    });

    recentTasks.forEach(task => {
      activities.push({
        type: 'task',
        message: `${task.enabled ? '启用了' : '暂停了'}搜索任务 "${task.keyword}"`,
        time: this.formatTime(task.updatedAt),
        entityId: task.id.toString(),
      });
    });

    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      return `${days}天前`;
    }
  }
}
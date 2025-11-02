import { Injectable } from '@pro/core';
import {
    useEntityManager,
    WeiboPostEntity,
    WeiboUserEntity,
} from '@pro/entities';
import { RawDataSourceService } from '@pro/mongodb';
import { SourceType, ProcessingStatus } from '@pro/types';
import * as cheerio from 'cheerio';

/**
 * 内嵌式数据清洗服务 - 直接处理MongoDB原始数据到PostgreSQL
 *
 * 简化版Cleaner,避免依赖完整的Cleaner服务栈
 */
@Injectable()
export class EmbeddedCleanerService {
    constructor(
        private readonly rawDataService: RawDataSourceService,
    ) { }

    /**
     * 清洗所有待处理的搜索结果数据
     */
    async cleanPendingSearchResults(): Promise<{
        totalProcessed: number;
        totalPosts: number;
        totalUsers: number;
    }> {
        const result = await this.rawDataService.findWithFilters({
            status: ProcessingStatus.PENDING,
            sourceType: SourceType.WEIBO_KEYWORD_SEARCH,
        });

        const pendingDocs = result.items;

        let totalProcessed = 0;
        let totalPosts = 0;
        let totalUsers = 0;

        for (const doc of pendingDocs) {
            try {
                const result = await this.processSearchResultDocument(doc);
                totalProcessed++;
                totalPosts += result.postsCount;
                totalUsers += result.usersCount;

                await this.rawDataService.markCompleted(String(doc._id));
            } catch (error) {
                await this.rawDataService.markFailed(
                    String(doc._id),
                    error instanceof Error ? error.message : String(error)
                );
            }
        }

        return { totalProcessed, totalPosts, totalUsers };
    }

    /**
     * 处理单个搜索结果文档
     */
    private async processSearchResultDocument(doc: any): Promise<{
        postsCount: number;
        usersCount: number;
    }> {
        const $ = cheerio.load(doc.rawContent);
        const posts: Array<Partial<WeiboPostEntity>> = [];
        const users: Map<string, Partial<WeiboUserEntity>> = new Map();

        // 解析微博卡片
        $('div[action-type="feed_list_item"]').each((_index, element) => {
            try {
                const mid = $(element).attr('mid');
                if (!mid) return;

                // 提取用户信息
                const userLink = $(element).find('.info a.name').first();
                const userNickname = userLink.text().trim();
                const userUrl = userLink.attr('href');
                const userIdMatch = userUrl?.match(/\/u\/(\d+)/);
                const userId = userIdMatch ? userIdMatch[1] : null;

                if (userId && !users.has(userId)) {
                    users.set(userId, {
                        id: Number(userId),
                        screen_name: userNickname,
                        verified: $(element).find('.icon-verify').length > 0,
                    });
                }

                // 提取微博内容
                const contentElement = $(element).find('p[node-type="feed_list_content"]');
                const content = contentElement.text().trim();

                // 提取时间
                const timeElement = $(element).find('.from a').first();
                const timeText = timeElement.text().trim();
                const publishTime = this.parseTimeText(timeText);

                // 提取互动数据
                const actions = $(element).find('.card-act .item');
                const repostsCount = this.extractCount(actions.eq(0).text());
                const commentsCount = this.extractCount(actions.eq(1).text());
                const likesCount = this.extractCount(actions.eq(2).text());

                if (userId) {
                    posts.push({
                        id: mid,
                        text: content,
                        created_at: publishTime.toISOString(),
                        reposts_count: repostsCount,
                        comments_count: commentsCount,
                        attitudes_count: likesCount,
                        source: '网页',
                    });
                }
            } catch (error) {
            }
        });

        // 批量保存用户
        if (users.size > 0) {
            const userValues = Array.from(users.values())
                .filter(u => u.id && u.screen_name)
                .map(u => ({
                    id: u.id!,
                    screen_name: u.screen_name!,
                    verified: u.verified ?? false,
                    followers_count: 0,
                    friends_count: 0,
                    statuses_count: 0,
                }));

            if (userValues.length > 0) {
                await useEntityManager(async m => {
                    await m.upsert(WeiboUserEntity, userValues, ['id'])
                })
            }
        }

        // 批量保存微博
        if (posts.length > 0) {
            await useEntityManager(async m => {
                await m.upsert(WeiboPostEntity, posts as any[], ['id'])
            })
        }

        return {
            postsCount: posts.length,
            usersCount: users.size,
        };
    }

    /**
     * 解析时间文本
     */
    private parseTimeText(timeText: string): Date {
        const now = new Date();

        if (timeText.includes('分钟前')) {
            const minutes = Number.parseInt(timeText, 10);
            return new Date(now.getTime() - minutes * 60 * 1000);
        }

        if (timeText.includes('小时前')) {
            const hours = Number.parseInt(timeText, 10);
            return new Date(now.getTime() - hours * 60 * 60 * 1000);
        }

        if (timeText.includes('今天')) {
            const match = timeText.match(/(\d{1,2}):(\d{2})/);
            if (match) {
                const result = new Date(now);
                result.setHours(Number.parseInt(match[1]!, 10));
                result.setMinutes(Number.parseInt(match[2]!, 10));
                return result;
            }
        }

        return now;
    }

    /**
     * 提取数字计数
     */
    private extractCount(text: string): number {
        const match = text.match(/\d+/);
        return match ? Number.parseInt(match[0], 10) : 0;
    }
}

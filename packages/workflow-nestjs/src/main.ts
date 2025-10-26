
/**
 * 完成下面的任务
 * 
 * 这是一个复杂的任务  你要拆分成不少于40个子任务 来完成这个复杂的任务
 * 
 * 需求分析

  这是一个微博数据采集与分析工作流系统,核心需求包括:
  - 基于关键词和时间范围的帖子采集
  - 账号健康度管理
  - 多层级数据抓取(帖子→评论→用户→历史)
  - 水军/机器人账号识别
  - 原始数据MongoDB存储 + RabbitMQ异步通知

  任务拆解(48个子任务)

  A组:基础设施层(可并行 - 8个任务)

  1. 设计账号健康度管理数据模型(Account Health Entity)
  2. 实现账号健康度选择算法(getBestHealthAccount)
  3. 设计MongoDB原始数据Schema(RawData Collection设计)
  4. 设计RabbitMQ消息队列Topic结构
  5. 创建工作流基础抽象类(WorkflowBase)
  6. 设计工作流状态机模型(WorkflowState Entity)
  7. 实现分布式锁机制(避免重复采集)
  8. 设计爬虫任务优先级队列

  B组:主工作流实现(依赖A组 - 10个任务)

  9. 实现Step1:首页链接生成器(generateSearchUrl)
  10. 实现Step2:HTML抓取服务(fetchHtmlWithAccount)
  11. 实现MongoDB原始HTML保存逻辑(saveRawHtml)
  12. 实现Step3:HTML解析器(parseSearchResultHtml)
  13. 实现Step4.1:帖子ID提取器(extractPostIds)
  14. 实现Step4.2:下一页判断逻辑(hasNextPage)
  15. 实现Step4.3:时间边界计算逻辑(calculateNextTimeRange)
  16. 实现循环终止条件判断(shouldStopCrawling)
  17. 实现主工作流编排器(MainSearchWorkflow)
  18. 实现工作流错误重试机制(RetryStrategy)

  C组:帖子详情工作流(可并行 - 8个任务)

  19. 实现帖子详情页抓取(fetchPostDetail)
  20. 实现评论列表抓取(fetchComments)
  21. 实现子评论抓取(fetchSubComments)
  22. 实现点赞信息抓取(fetchLikes)
  23. 实现收藏信息抓取(fetchFavorites)
  24. 实现帖子详情数据保存(savePostDetail)
  25. 实现评论数据保存(saveComments)
  26. 实现详情工作流编排器(PostDetailWorkflow)

  D组:用户画像工作流(可并行 - 8个任务)

  27. 实现用户详细信息抓取(fetchUserProfile)
  28. 实现用户历史发帖列表抓取(fetchUserPosts)
  29. 实现用户行为特征提取(extractUserBehavior)
  30. 实现机器人账号识别算法(detectBotAccount)
  31. 实现水军账号识别算法(detectSpamAccount)
  32. 实现用户数据保存(saveUserProfile)
  33. 实现评论者画像批量处理(batchProcessCommenters)
  34. 实现用户画像工作流编排器(UserProfileWorkflow)

  E组:消息队列集成(依赖B/C/D - 6个任务)

  35. 实现RawDataSaved事件发布者(publishRawDataEvent)
  36. 实现PostDetailCompleted事件发布者
  37. 实现UserProfileCompleted事件发布者
  38. 实现Cleaner服务消息消费者(DataCleaningConsumer)
  39. 实现死信队列处理(DeadLetterHandler)
  40. 实现消息幂等性校验(MessageDeduplication)

  F组:监控与优化(可并行 - 8个任务)

  41. 实现工作流执行进度追踪(WorkflowProgress)
  42. 实现账号健康度自动恢复机制(HealthRecovery)
  43. 实现爬虫速率限制(RateLimiter)
  44. 实现IP代理池管理(ProxyPoolManager)
  45. 实现数据采集统计Dashboard(CrawlStatistics)
  46. 实现异常账号自动告警(AccountAlert)
  47. 实现工作流可视化监控(WorkflowMonitor)
  48. 实现性能瓶颈分析工具(PerformanceProfiler)

  并行执行策略

  第一阶段(并行):
  - A组全部8个任务同时执行(基础设施无依赖)

  第二阶段(并行):
  - B组主工作流实现
  - C组帖子详情工作流
  - D组用户画像工作流
  (三组可同时开发,相互独立)

  第三阶段(串行):
  - E组消息队列集成(需要B/C/D完成)

  第四阶段(并行):
  - F组监控优化(可与其他阶段并行)

  执行计划

  我将创建4个并行的code-artisan代理处理不同模块:

  # Agent 1: 基础设施 + 主工作流
  codex exec "实现任务1-18:账号健康度管理、工作流基础框架、主搜索流程" --full-auto

  # Agent 2: 帖子详情工作流
  codex exec "实现任务19-26:帖子详情、评论、点赞、收藏采集流程" --full-auto

  # Agent 3: 用户画像工作流
  codex exec "实现任务27-34:用户信息采集、机器人识别、水军检测算法" --full-auto

  # Agent 4: 消息队列 + 监控
  codex exec "实现任务35-48:RabbitMQ集成、工作流监控、性能优化" --full-auto

  技术栈建议

  - 工作流引擎: Temporal (已在项目中)
  - 爬虫框架: Playwright (已有crawler服务)
  - 数据存储: MongoDB (原始数据) + PostgreSQL (结构化数据)
  - 消息队列: RabbitMQ (已有)
  - 账号管理: Redis (健康度缓存)

 * 
 */

import { NestFactory } from '@nestjs/core';
import { WorkflowModule } from './workflow.module';
import { MainSearchWorkflow } from './workflows/main-search.workflow';
import { AccountHealthService } from './services/account-health.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { WeiboHtmlParser } from './parsers/weibo-html.parser';
import { RabbitMQService } from '@pro/rabbitmq';
import { RawDataSourceService } from '@pro/mongodb';
import { RedisClient } from '@pro/redis';

export async function main(keyword: string, startDate: Date, endDate: Date) {
    const app = await NestFactory.createApplicationContext(WorkflowModule, {
        logger: ['error', 'warn', 'log'],
    });

    try {
        // 使用类名直接获取服务
        const redisClient = app.get(RedisClient);
        const accountHealth = app.get(AccountHealthService);
        const distributedLock = app.get(DistributedLockService);
        const htmlParser = app.get(WeiboHtmlParser);
        const rawDataService = app.get(RawDataSourceService);
        const rabbitMQService = app.get(RabbitMQService);

        // 修复依赖注入问题：手动注入 RedisClient 到服务
        if (!(accountHealth as any).redis) {
            (accountHealth as any).redis = redisClient;
            (distributedLock as any).redis = redisClient;
        }

        const mainSearchWorkflow = app.get(MainSearchWorkflow);

        // 修复依赖注入问题：手动注入服务到 MainSearchWorkflow
        if (!(mainSearchWorkflow as any).distributedLock) {
            (mainSearchWorkflow as any).accountHealth = accountHealth;
            (mainSearchWorkflow as any).distributedLock = distributedLock;
            (mainSearchWorkflow as any).htmlParser = htmlParser;
            (mainSearchWorkflow as any).rawDataService = rawDataService;
            (mainSearchWorkflow as any).rabbitMQService = rabbitMQService;
        }

        console.log(`\n========== 微博数据采集工作流启动 ==========`);
        console.log(`关键词: ${keyword}`);
        console.log(`时间范围: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
        console.log(`==========================================\n`);

        const result = await mainSearchWorkflow.execute({
            keyword,
            startDate,
            endDate,
            maxPages: 50,
        });

        console.log(`\n========== 工作流执行完成 ==========`);
        console.log(`状态: ${result.status}`);
        console.log(`总帖子数: ${result.totalPostsFound}`);
        console.log(`总页数: ${result.totalPagesProcessed}`);
        console.log(`时间窗口数: ${result.timeWindowsProcessed}`);
        if (result.errorMessage) {
            console.log(`错误信息: ${result.errorMessage}`);
        }
        console.log(`===================================\n`);

        return result;
    } catch (error) {
        console.error('工作流执行失败:', error);
        throw error;
    } finally {
        await app.close();
    }
}

if (require.main === module) {
    // 使用新的测试关键词避免唯一索引冲突
    const testKeyword = `国庆`;
    main(testKeyword, new Date(`2025-10-25 00:00:00`), new Date())
        .then(() => {
            console.log('任务完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('任务失败:', error);
            process.exit(1);
        });
}


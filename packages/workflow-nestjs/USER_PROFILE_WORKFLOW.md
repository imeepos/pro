# 用户画像工作流 (User Profile Workflow)

## 📋 概述

用户画像工作流用于抓取和分析微博用户的详细信息、历史发帖行为，并通过规则引擎识别机器人账号和水军账号。

## 🎯 任务27-34 实现

### 核心功能

#### 27. 抓取用户详细信息 ✅
- **实现**: `UserProfileVisitor.visitFetchUserProfile()`
- **输入**: userId (微博用户ID)
- **使用**: WeiboProfileService API
- **提取字段**:
  - 昵称、认证信息
  - 粉丝数、关注数、发帖数
  - 简介、地区
  - 头像、封面图
  - VIP状态、用户类型

#### 28. 抓取用户历史发帖列表 ✅
- **实现**: `UserProfileVisitor.visitFetchUserPosts()`
- **策略**: 只抓取列表页，不递归详情页（点到为止）
- **限制**: 默认最多前3页（配置化）
- **提取字段**: 帖子ID、时间、内容摘要、转发/评论/点赞数、发布来源

#### 29. 提取用户行为特征 ✅
- **实现**: `UserBehaviorAnalyzerService.analyzeUserBehavior()`
- **分析维度**:
  - `postsPerDay`: 发帖频率（条/天）
  - `postingTimeDistribution`: 发帖时间分布（早中晚夜）
  - `deviceDistribution`: 设备类型分布（iPhone/Android/Web等）
  - `contentSimilarity`: 内容相似度（0-1）
  - `interactionRatio`: 原创内容比例（0-1）

#### 30. 机器人账号识别算法 ✅
- **实现**: `BotDetectorService.detectBot()`
- **规则引擎**:
  - 发帖频率 > 100条/天
  - 昵称包含大量随机数字（6个以上且占比>30%）
  - 粉丝数 < 10 且 关注数 > 1000
  - 内容相似度 > 0.8
  - 注册时间 < 30天 且 发帖数 > 500条
  - 仅使用Web端发帖
  - 几乎不发原创内容（< 10%）
- **输出**: `{ isSuspicious: boolean, confidence: number, reasons: string[] }`

#### 31. 水军账号识别算法 ✅
- **实现**: `SpamDetectorService.detectSpam()`
- **规则引擎**:
  - 大量包含营销关键词（> 30%的帖子）
  - 发帖时间高度集中（> 70%在同一小时）
  - 设备类型单一
  - 大量转发（> 80%）
  - 频繁转发特定账号（> 30%的帖子@同一批人）
- **关键词库**: 加微信、vx、wx、私信、优惠、促销、代购、兼职、赚钱、投资、理财、贷款、信用卡
- **输出**: `{ isSuspicious: boolean, confidence: number, reasons: string[] }`

#### 32. 批量处理评论者/点赞者 ✅
- **实现**: `UserProfileWorkflow.processBatch()`
- **队列化处理**: 每批次并发5个请求（可配置）
- **去重策略**: 24小时内相同userId只抓取一次（Redis缓存）
- **错误隔离**: 单个用户失败不影响批量任务

#### 33. 保存数据到MongoDB ✅
- **实现**: `UserProfileVisitor.visitSaveUserProfile()`
- **使用**: `@pro/mongodb` RawDataSourceService
- **SourceType**: `'weibo_user_info'`
- **数据结构**:
```typescript
{
  sourceType: 'weibo_user_info',
  sourceUrl: `https://weibo.com/u/${userId}`,
  rawContent: JSON.stringify({
    profile: {...},
    recentPosts: [...],
    behaviorFeatures: {...},
    botDetection: {...},
    spamDetection: {...}
  }),
  metadata: {
    userId,
    nickname,
    isBotSuspect: boolean,
    isSpammerSuspect: boolean,
    botConfidence: number,
    spamConfidence: number
  }
}
```

#### 34. UserProfileWorkflow 编排器 ✅
- **实现**: `UserProfileWorkflow.execute()`
- **执行流程**:
  1. 并行抓取: 用户信息 || 历史发帖
  2. 行为特征提取
  3. 并行检测: 机器人识别 || 水军识别
  4. 保存MongoDB
  5. 标记已处理（Redis去重）
- **批量模式**: 支持一次性处理多个userId
- **容错机制**: 单个失败不影响整体

## 📁 实现文件

### 类型定义
- `/packages/workflow-nestjs/src/types/user-profile.types.ts`
  - UserProfileData
  - UserPostSummary
  - UserBehaviorFeatures
  - DetectionResult
  - UserProfileWorkflowData
  - UserProfileWorkflowInput/Output
  - UserProfileWorkflowConfig

### 服务层
- `/packages/workflow-nestjs/src/services/user-behavior-analyzer.service.ts` - 行为特征提取
- `/packages/workflow-nestjs/src/services/bot-detector.service.ts` - 机器人识别
- `/packages/workflow-nestjs/src/services/spam-detector.service.ts` - 水军识别

### AST节点
- `/packages/workflow-nestjs/src/nodes/fetch-user-profile.node.ts`
- `/packages/workflow-nestjs/src/nodes/fetch-user-posts.node.ts`
- `/packages/workflow-nestjs/src/nodes/analyze-user-behavior.node.ts`
- `/packages/workflow-nestjs/src/nodes/detect-bot.node.ts`
- `/packages/workflow-nestjs/src/nodes/detect-spam.node.ts`
- `/packages/workflow-nestjs/src/nodes/save-user-profile.node.ts`

### Visitor实现
- `/packages/workflow-nestjs/src/visitors/user-profile.visitor.ts`
  - visitFetchUserProfile()
  - visitFetchUserPosts()
  - visitAnalyzeUserBehavior()
  - visitDetectBot()
  - visitDetectSpam()
  - visitSaveUserProfile()

### 工作流编排
- `/packages/workflow-nestjs/src/workflows/user-profile.workflow.ts`
  - execute() - 主入口
  - processBatch() - 批量处理
  - processSingleUser() - 单用户处理
  - checkDuplication() / markAsProcessed() - 去重逻辑

### 模块注册
- `/packages/workflow-nestjs/src/workflow.module.ts` - 注册所有服务和Visitor
- `/packages/workflow-nestjs/src/index.ts` - 导出公共接口

### Enum扩展
- `/packages/types/src/enums/raw-data.ts` - 新增 `WEIBO_USER_INFO`

## ⚙️ 配置参数

```typescript
{
  maxPostPages: 3,                        // 最大历史发帖页数
  botDetectionThresholds: {
    maxPostsPerDay: 100,                  // 机器人识别：最大日发帖数
    minFollowers: 10,                     // 机器人识别：最小粉丝数
    maxFollowing: 1000,                   // 机器人识别：最大关注数
    minSimilarity: 0.8,                   // 机器人识别：最小内容相似度
    maxAccountAgeDays: 30,                // 机器人识别：新账号天数阈值
    minPostsForNewAccount: 500            // 机器人识别：新账号最小发帖数
  },
  spamKeywords: [                         // 水军关键词库
    '加微信', '加vx', '加wx', '私信',
    '优惠', '促销', '代购', '兼职',
    '赚钱', '投资', '理财', '贷款', '信用卡'
  ],
  queueConcurrency: 5,                    // 批量处理并发数
  cacheTTL: 86400                         // 缓存时间（秒）
}
```

## 🚀 使用示例

```typescript
import { UserProfileWorkflow } from '@pro/workflow-nestjs'

// 单个用户
const result = await userProfileWorkflow.execute({
  userId: '1234567890',
  maxPostPages: 3
})

// 批量处理
const result = await userProfileWorkflow.execute({
  userId: ['1234567890', '0987654321', '1111111111'],
  maxPostPages: 2
})

// 结果
{
  success: true,
  results: [
    {
      userId: '1234567890',
      rawDataId: '65f123abc...',
      isBotSuspect: false,
      isSpammerSuspect: true
    }
  ]
}
```

## 🔧 DAG工作流结构

```
          ┌─────────────────────┐
          │ FetchUserProfile    │
          └──────────┬──────────┘
                     │ profile
                     ↓
          ┌─────────────────────┐     ┌─────────────────────┐
          │ FetchUserPosts      │────→│ AnalyzeUserBehavior │
          └─────────────────────┘     └──────────┬──────────┘
                  │ posts                        │ behaviorFeatures
                  │                              │
                  ↓                              ↓
          ┌─────────────────────┐     ┌─────────────────────┐
          │   DetectSpam        │     │    DetectBot        │
          └──────────┬──────────┘     └──────────┬──────────┘
                     │                           │
                     └───────────┬───────────────┘
                                 ↓
                     ┌─────────────────────┐
                     │ SaveUserProfile     │
                     └─────────────────────┘
```

## ✅ 类型检查结果

用户画像工作流相关代码已通过TypeScript类型检查，无错误。

剩余的构建错误来自其他Agent的代码（main.ts, executor.service.ts等），不影响用户画像功能。

## 📊 与PostDetailWorkflow的集成

用户画像工作流可以从PostDetailWorkflow接收userId列表：

```typescript
// PostDetailWorkflow中
const commentUserIds = comments.map(c => c.userId)
const likeUserIds = likes.map(l => l.userId)

// 调用UserProfileWorkflow
await userProfileWorkflow.execute({
  userId: [...commentUserIds, ...likeUserIds]
})
```

## 🎨 设计原则

遵循代码艺术家哲学：
- **存在即合理**: 每个类、方法都有明确且不可替代的职责
- **优雅即简约**: 代码自文档化，无冗余注释
- **性能即艺术**: 使用Redis缓存、批量并发、去重策略优化性能
- **错误处理如为人处世的哲学**: 单个失败不影响整体，优雅降级
- **日志是思想的表达**: 关键节点记录有意义的信息

## 🔍 监控建议

建议监控以下指标：
- 机器人/水军识别命中率
- 平均处理时间
- 缓存命中率
- 失败率和错误原因分布
- 每日处理用户数量

---

**实现完成**: Agent 3 ✅
**任务范围**: 任务27-34
**代码质量**: 通过类型检查，遵循项目规范

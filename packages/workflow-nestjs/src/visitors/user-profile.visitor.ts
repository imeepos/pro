import { Injectable, Logger } from '@nestjs/common'
import { WeiboProfileService } from '@pro/weibo'
import { RedisClient } from '@pro/redis'
import {
  SourceType,
  SourcePlatform,
  QUEUE_NAMES,
  RawDataReadyEvent,
  UserProfileCompletedEvent,
} from '@pro/types'
import { RabbitMQService } from '@pro/rabbitmq'
import { createHash } from 'crypto'
import type { UserProfileData, UserPostSummary } from '../types/user-profile.types'
import { FetchUserProfileNode } from '../nodes/fetch-user-profile.node'
import { FetchUserPostsNode } from '../nodes/fetch-user-posts.node'
import { AnalyzeUserBehaviorNode } from '../nodes/analyze-user-behavior.node'
import { DetectBotNode } from '../nodes/detect-bot.node'
import { DetectSpamNode } from '../nodes/detect-spam.node'
import { SaveUserProfileNode } from '../nodes/save-user-profile.node'
import { UserBehaviorAnalyzerService } from '../services/user-behavior-analyzer.service'
import { BotDetectorService } from '../services/bot-detector.service'
import { SpamDetectorService } from '../services/spam-detector.service'
import { RawDataSourceService } from '@pro/mongodb'
import { Handler } from '@pro/workflow-core'

@Injectable()
export class UserProfileVisitor {
  private readonly cachePrefix = 'user-profile:cache:'
  private readonly cacheTTL = 86400
  private readonly logger = new Logger(UserProfileVisitor.name);

  constructor(
    private readonly weiboProfileService: WeiboProfileService,
    private readonly redis: RedisClient,
    private readonly behaviorAnalyzer: UserBehaviorAnalyzerService,
    private readonly botDetector: BotDetectorService,
    private readonly spamDetector: SpamDetectorService,
    private readonly rawDataService: RawDataSourceService,
    private readonly rabbitMQService: RabbitMQService
  ) {}
  @Handler(FetchUserProfileNode)
  async visitFetchUserProfile(node: FetchUserProfileNode): Promise<FetchUserProfileNode> {
    try {
      const cacheKey = `${this.cachePrefix}${node.userId}`
      const cached = await this.redis.get<UserProfileData>(cacheKey)

      if (cached) {
        this.logger.debug(`使用缓存的用户信息: ${node.userId}`)
        node.profile = cached
        node.state = 'success'
        return node
      }

      const profileInfo = await this.weiboProfileService.fetchProfileInfo(node.userId)

      const user = profileInfo.data.user

      const profile: UserProfileData = {
        userId: node.userId,
        nickname: user.screen_name,
        verified: user.verified || false,
        ...(user.verified_reason && { verifiedReason: user.verified_reason }),
        followersCount: user.followers_count,
        friendsCount: user.friends_count,
        statusesCount: user.statuses_count,
        ...(user.description && { description: user.description }),
        ...(user.location && { location: user.location }),
        profileImageUrl: user.profile_image_url,
        ...(user.cover_image_phone && { coverImageUrl: user.cover_image_phone }),
        ...(user.svip !== undefined && { svip: user.svip }),
        ...(user.vvip !== undefined && { vvip: user.vvip }),
        ...(user.user_type !== undefined && { userType: user.user_type })
      }

      await this.redis.setex(cacheKey, this.cacheTTL, profile)

      node.profile = profile
      node.state = 'success'
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`抓取用户信息失败: ${node.userId}`, error)
      node.error = message
      node.state = 'fail'
    }

    return node
  }

  @Handler(FetchUserPostsNode)
  async visitFetchUserPosts(node: FetchUserPostsNode): Promise<FetchUserPostsNode> {
    try {
      const maxPages = node.maxPages || 3
      const posts: UserPostSummary[] = []

      for (let page = 1; page <= maxPages; page++) {
        const timeline = await this.weiboProfileService.fetchProfileTimeline(node.userId, {
          page
        })

        if (!timeline.data.list || timeline.data.list.length === 0) {
          break
        }

        for (const status of timeline.data.list) {
          posts.push({
            statusId: String(status.id),
            text: status.text_raw || status.text || '',
            createdAt: status.created_at,
            repostsCount: status.reposts_count || 0,
            commentsCount: status.comments_count || 0,
            attitudesCount: status.attitudes_count || 0,
            source: status.source
          })
        }

        if (!timeline.data.since_id) {
          break
        }
      }

      node.posts = posts
      node.state = 'success'
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`抓取用户发帖列表失败: ${node.userId}`, error)
      node.error = message
      node.state = 'fail'
    }

    return node
  }

  @Handler(AnalyzeUserBehaviorNode)
  async visitAnalyzeUserBehavior(
    node: AnalyzeUserBehaviorNode
  ): Promise<AnalyzeUserBehaviorNode> {
    try {
      const features = this.behaviorAnalyzer.analyzeUserBehavior(
        node.posts,
        node.profile?.createdAt
      )

      node.behaviorFeatures = features
      node.state = 'success'
    } catch (error) {
      this.logger.error('分析用户行为特征失败', error)
      node.state = 'fail'
    }

    return node
  }

  @Handler(DetectBotNode)
  async visitDetectBot(node: DetectBotNode): Promise<DetectBotNode> {
    try {
      const config = this.getDefaultConfig()

      const detection = this.botDetector.detectBot(
        node.profile,
        node.behaviorFeatures,
        config
      )

      node.botDetection = detection
      node.state = 'success'
    } catch (error) {
      this.logger.error('机器人检测失败', error)
      node.state = 'fail'
    }

    return node
  }

  @Handler(DetectSpamNode)
  async visitDetectSpam(node: DetectSpamNode): Promise<DetectSpamNode> {
    try {
      const config = this.getDefaultConfig()

      const detection = this.spamDetector.detectSpam(
        node.posts,
        node.behaviorFeatures,
        config
      )

      node.spamDetection = detection
      node.state = 'success'
    } catch (error) {
      this.logger.error('水军检测失败', error)
      node.state = 'fail'
    }

    return node
  }

  @Handler(SaveUserProfileNode)
  async visitSaveUserProfile(node: SaveUserProfileNode): Promise<SaveUserProfileNode> {
    try {
      const rawContent = JSON.stringify(node.workflowData)
      const sourceUrl = `https://weibo.com/u/${node.userId}`
      const contentHash = createHash('md5').update(rawContent).digest('hex')

      const rawData = await this.rawDataService.create({
        sourceType: SourceType.WEIBO_USER_INFO,
        sourceUrl,
        rawContent,
        metadata: {
          userId: node.userId,
          nickname: node.workflowData.profile.nickname,
          isBotSuspect: node.workflowData.botDetection.isSuspicious,
          isSpammerSuspect: node.workflowData.spamDetection.isSuspicious,
          botConfidence: node.workflowData.botDetection.confidence,
          spamConfidence: node.workflowData.spamDetection.confidence
        }
      })

      node.rawDataId = String(rawData._id)

      const rawDataReadyEvent: RawDataReadyEvent = {
        rawDataId: node.rawDataId,
        sourceType: SourceType.WEIBO_USER_INFO,
        sourcePlatform: SourcePlatform.WEIBO,
        sourceUrl,
        contentHash,
        metadata: {
          fileSize: Buffer.byteLength(rawContent, 'utf-8'),
        },
        createdAt: new Date().toISOString(),
      }

      try {
        await this.rabbitMQService.publish(
          QUEUE_NAMES.RAW_DATA_READY,
          rawDataReadyEvent
        )
      } catch (error) {
        this.logger.error(`发布 RawDataReady 事件失败: ${node.userId}`, error)
      }

      const userProfileCompletedEvent: UserProfileCompletedEvent = {
        userId: node.userId,
        rawDataId: node.rawDataId,
        isBotSuspect: node.workflowData.botDetection.isSuspicious,
        isSpammerSuspect: node.workflowData.spamDetection.isSuspicious,
        behaviorScore: {
          botConfidence: node.workflowData.botDetection.confidence,
          spamConfidence: node.workflowData.spamDetection.confidence,
        },
        createdAt: new Date().toISOString(),
      }

      try {
        await this.rabbitMQService.publish(
          QUEUE_NAMES.USER_PROFILE_COMPLETED,
          userProfileCompletedEvent
        )
      } catch (error) {
        this.logger.error(`发布 UserProfileCompleted 事件失败: ${node.userId}`, error)
      }

      node.state = 'success'

      this.logger.log(`用户画像已保存并发布事件: ${node.userId}`, {
        rawDataId: node.rawDataId,
        isBotSuspect: node.workflowData.botDetection.isSuspicious,
        isSpammerSuspect: node.workflowData.spamDetection.isSuspicious,
        botConfidence: node.workflowData.botDetection.confidence,
        spamConfidence: node.workflowData.spamDetection.confidence,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`保存用户画像失败: ${node.userId}`, error)
      node.error = message
      node.state = 'fail'
    }

    return node
  }

  private getDefaultConfig() {
    return {
      maxPostPages: 3,
      botDetectionThresholds: {
        maxPostsPerDay: 100,
        minFollowers: 10,
        maxFollowing: 1000,
        minSimilarity: 0.8,
        maxAccountAgeDays: 30,
        minPostsForNewAccount: 500
      },
      spamKeywords: [
        '加微信',
        '加vx',
        '加wx',
        '私信',
        '优惠',
        '促销',
        '代购',
        '兼职',
        '赚钱',
        '投资',
        '理财',
        '贷款',
        '信用卡'
      ],
      queueConcurrency: 5,
      cacheTTL: 86400
    }
  }
}

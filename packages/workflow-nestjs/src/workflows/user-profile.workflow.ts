import { Injectable } from '@nestjs/common'
import { PinoLogger } from '@pro/logger'
import { RedisClient } from '@pro/redis'
import type {
  UserProfileWorkflowInput,
  UserProfileWorkflowOutput,
  UserProfileWorkflowData
} from '../types/user-profile.types'
import { FetchUserProfileNode } from '../nodes/fetch-user-profile.node'
import { FetchUserPostsNode } from '../nodes/fetch-user-posts.node'
import { AnalyzeUserBehaviorNode } from '../nodes/analyze-user-behavior.node'
import { DetectBotNode } from '../nodes/detect-bot.node'
import { DetectSpamNode } from '../nodes/detect-spam.node'
import { SaveUserProfileNode } from '../nodes/save-user-profile.node'
import { UserProfileVisitor } from '../visitors/user-profile.visitor'

@Injectable()
export class UserProfileWorkflow {
  private readonly deduplicationPrefix = 'user-profile:processed:'
  private readonly deduplicationTTL = 86400
  private readonly queueConcurrency = 5

  constructor(
    private readonly logger: PinoLogger,
    private readonly redis: RedisClient,
    private readonly visitor: UserProfileVisitor
  ) {
    this.logger.setContext(UserProfileWorkflow.name)
  }

  async execute(input: UserProfileWorkflowInput): Promise<UserProfileWorkflowOutput> {
    const userIds = Array.isArray(input.userId) ? input.userId : [input.userId]
    const maxPostPages = input.maxPostPages || 3

    this.logger.info(`开始用户画像工作流`, {
      totalUsers: userIds.length,
      maxPostPages
    })

    const results = await this.processBatch(userIds, maxPostPages)

    const success = results.every(r => !r.error)

    this.logger.info(`用户画像工作流完成`, {
      total: results.length,
      success: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length
    })

    return { success, results }
  }

  private async processBatch(
    userIds: string[],
    maxPostPages: number
  ): Promise<UserProfileWorkflowOutput['results']> {
    const results: UserProfileWorkflowOutput['results'] = []

    for (let i = 0; i < userIds.length; i += this.queueConcurrency) {
      const batch = userIds.slice(i, i + this.queueConcurrency)

      const batchResults = await Promise.allSettled(
        batch.map(userId => this.processSingleUser(userId, maxPostPages))
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            userId: 'unknown',
            isBotSuspect: false,
            isSpammerSuspect: false,
            error: result.reason?.message || String(result.reason)
          })
        }
      }
    }

    return results
  }

  private async processSingleUser(
    userId: string,
    maxPostPages: number
  ): Promise<UserProfileWorkflowOutput['results'][0]> {
    const isDuplicate = await this.checkDuplication(userId)
    if (isDuplicate) {
      this.logger.debug(`用户已处理过，跳过: ${userId}`)
      return {
        userId,
        isBotSuspect: false,
        isSpammerSuspect: false,
        error: 'already_processed'
      }
    }

    try {
      const fetchProfileNode = new FetchUserProfileNode()
      fetchProfileNode.userId = userId

      const fetchPostsNode = new FetchUserPostsNode()
      fetchPostsNode.userId = userId
      fetchPostsNode.maxPages = maxPostPages

      const analyzeBehaviorNode = new AnalyzeUserBehaviorNode()
      const detectBotNode = new DetectBotNode()
      const detectSpamNode = new DetectSpamNode()
      const saveNode = new SaveUserProfileNode()
      saveNode.userId = userId

      // Execute workflow steps
      await this.visitor.visitFetchUserProfile(fetchProfileNode)
      await this.visitor.visitFetchUserPosts(fetchPostsNode)

      if (
        fetchProfileNode.state !== 'success' ||
        fetchPostsNode.state !== 'success'
      ) {
        throw new Error(
          fetchProfileNode.error || fetchPostsNode.error || '数据抓取失败'
        )
      }

      analyzeBehaviorNode.posts = fetchPostsNode.posts || []
      if (fetchProfileNode.profile) {
        analyzeBehaviorNode.profile = fetchProfileNode.profile
      }
      await this.visitor.visitAnalyzeUserBehavior(analyzeBehaviorNode)

      detectBotNode.profile = fetchProfileNode.profile!
      detectBotNode.behaviorFeatures = analyzeBehaviorNode.behaviorFeatures!
      await this.visitor.visitDetectBot(detectBotNode)

      detectSpamNode.posts = fetchPostsNode.posts || []
      detectSpamNode.behaviorFeatures = analyzeBehaviorNode.behaviorFeatures!
      await this.visitor.visitDetectSpam(detectSpamNode)

      const workflowData: UserProfileWorkflowData = {
        profile: fetchProfileNode.profile!,
        recentPosts: fetchPostsNode.posts || [],
        behaviorFeatures: analyzeBehaviorNode.behaviorFeatures || {
          postsPerDay: 0,
          postingTimeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
          deviceDistribution: {},
          contentSimilarity: 0,
          interactionRatio: 0
        },
        botDetection: detectBotNode.botDetection || {
          isSuspicious: false,
          confidence: 0,
          reasons: []
        },
        spamDetection: detectSpamNode.spamDetection || {
          isSuspicious: false,
          confidence: 0,
          reasons: []
        }
      }

      saveNode.workflowData = workflowData
      await this.visitor.visitSaveUserProfile(saveNode)

      if (saveNode.state !== 'success') {
        throw new Error(saveNode.error || '保存数据失败')
      }

      await this.markAsProcessed(userId)

      const result: UserProfileWorkflowOutput['results'][0] = {
        userId,
        isBotSuspect: workflowData.botDetection.isSuspicious,
        isSpammerSuspect: workflowData.spamDetection.isSuspicious
      }

      if (saveNode.rawDataId) {
        result.rawDataId = saveNode.rawDataId
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`处理用户失败: ${userId}`, error)

      return {
        userId,
        isBotSuspect: false,
        isSpammerSuspect: false,
        error: message
      }
    }
  }

  private async checkDuplication(userId: string): Promise<boolean> {
    const key = `${this.deduplicationPrefix}${userId}`
    return await this.redis.exists(key)
  }

  private async markAsProcessed(userId: string): Promise<void> {
    const key = `${this.deduplicationPrefix}${userId}`
    await this.redis.setex(key, this.deduplicationTTL, '1')
  }
}

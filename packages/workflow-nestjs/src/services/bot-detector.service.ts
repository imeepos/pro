import { Injectable } from '@pro/core'
import type {
  UserProfileData,
  UserBehaviorFeatures,
  DetectionResult,
  UserProfileWorkflowConfig
} from '../types/user-profile.types'

@Injectable()
export class BotDetectorService {
  detectBot(
    profile: UserProfileData,
    behavior: UserBehaviorFeatures,
    config: UserProfileWorkflowConfig
  ): DetectionResult {
    const reasons: string[] = []
    let suspicionScore = 0

    const accountAgeDays = this.calculateAccountAge(profile.createdAt)

    if (behavior.postsPerDay > config.botDetectionThresholds.maxPostsPerDay) {
      reasons.push(
        `发帖频率异常高: ${behavior.postsPerDay}条/天 (阈值: ${config.botDetectionThresholds.maxPostsPerDay}条/天)`
      )
      suspicionScore += 0.3
    }

    if (this.hasRandomDigitsInNickname(profile.nickname)) {
      reasons.push(`昵称包含大量随机数字: ${profile.nickname}`)
      suspicionScore += 0.2
    }

    if (
      profile.followersCount < config.botDetectionThresholds.minFollowers &&
      profile.friendsCount > config.botDetectionThresholds.maxFollowing
    ) {
      reasons.push(
        `粉丝数极低且关注数极高: ${profile.followersCount}粉丝, ${profile.friendsCount}关注`
      )
      suspicionScore += 0.25
    }

    if (behavior.contentSimilarity > config.botDetectionThresholds.minSimilarity) {
      reasons.push(`内容高度重复: 相似度${(behavior.contentSimilarity * 100).toFixed(0)}%`)
      suspicionScore += 0.15
    }

    if (
      accountAgeDays < config.botDetectionThresholds.maxAccountAgeDays &&
      profile.statusesCount > config.botDetectionThresholds.minPostsForNewAccount
    ) {
      reasons.push(
        `新账号但发帖量极大: 注册${accountAgeDays}天, 发帖${profile.statusesCount}条`
      )
      suspicionScore += 0.2
    }

    const deviceTypes = Object.keys(behavior.deviceDistribution)
    if (deviceTypes.length === 1 && deviceTypes[0] === 'Web') {
      reasons.push('仅使用Web端发帖')
      suspicionScore += 0.1
    }

    if (behavior.interactionRatio < 0.1) {
      reasons.push(`几乎不发原创内容: 原创比例${(behavior.interactionRatio * 100).toFixed(0)}%`)
      suspicionScore += 0.1
    }

    const confidence = Math.min(suspicionScore, 1)
    const isSuspicious = confidence >= 0.5

    return {
      isSuspicious,
      confidence: Number(confidence.toFixed(2)),
      reasons
    }
  }

  private hasRandomDigitsInNickname(nickname: string): boolean {
    const digitMatches = nickname.match(/\d+/g)
    if (!digitMatches) return false

    const totalDigits = digitMatches.join('').length
    return totalDigits >= 6 && totalDigits / nickname.length > 0.3
  }

  private calculateAccountAge(createdAt?: string): number {
    if (!createdAt) return 365

    const created = new Date(createdAt)
    const now = new Date()
    const ageDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)

    return Math.max(1, Math.floor(ageDays))
  }
}

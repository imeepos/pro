import { Injectable } from '@nestjs/common'
import type {
  UserPostSummary,
  UserBehaviorFeatures,
  DetectionResult,
  UserProfileWorkflowConfig
} from '../types/user-profile.types'

@Injectable()
export class SpamDetectorService {
  detectSpam(
    posts: UserPostSummary[],
    behavior: UserBehaviorFeatures,
    config: UserProfileWorkflowConfig
  ): DetectionResult {
    const reasons: string[] = []
    let suspicionScore = 0

    const spamKeywordCount = this.countSpamKeywords(posts, config.spamKeywords)
    if (spamKeywordCount > posts.length * 0.3) {
      reasons.push(
        `大量包含营销关键词: ${spamKeywordCount}/${posts.length}条帖子`
      )
      suspicionScore += 0.3
    }

    const timeConcentration = this.checkTimeConcentration(posts)
    if (timeConcentration > 0.7) {
      reasons.push(
        `发帖时间高度集中: ${(timeConcentration * 100).toFixed(0)}%在同一时段`
      )
      suspicionScore += 0.2
    }

    const deviceTypes = Object.keys(behavior.deviceDistribution)
    if (deviceTypes.length === 1) {
      reasons.push(`设备类型单一: 仅使用${deviceTypes[0]}`)
      suspicionScore += 0.15
    }

    const repostRatio = 1 - behavior.interactionRatio
    if (repostRatio > 0.8) {
      reasons.push(`大量转发: 转发比例${(repostRatio * 100).toFixed(0)}%`)
      suspicionScore += 0.2
    }

    const repeatedTargets = this.findRepeatedTargets(posts)
    if (repeatedTargets.length > 0) {
      reasons.push(
        `频繁转发特定账号: ${repeatedTargets.join(', ')}`
      )
      suspicionScore += 0.25
    }

    const confidence = Math.min(suspicionScore, 1)
    const isSuspicious = confidence >= 0.5

    return {
      isSuspicious,
      confidence: Number(confidence.toFixed(2)),
      reasons
    }
  }

  private countSpamKeywords(posts: UserPostSummary[], keywords: string[]): number {
    let count = 0

    for (const post of posts) {
      const text = post.text.toLowerCase()
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          count++
          break
        }
      }
    }

    return count
  }

  private checkTimeConcentration(posts: UserPostSummary[]): number {
    if (posts.length === 0) return 0

    const hourBuckets: Record<number, number> = {}

    for (const post of posts) {
      const hour = new Date(post.createdAt).getHours()
      hourBuckets[hour] = (hourBuckets[hour] || 0) + 1
    }

    const maxConcentration = Math.max(...Object.values(hourBuckets))
    return maxConcentration / posts.length
  }

  private findRepeatedTargets(posts: UserPostSummary[]): string[] {
    const targetCounts: Record<string, number> = {}

    for (const post of posts) {
      const targets = this.extractMentions(post.text)
      for (const target of targets) {
        targetCounts[target] = (targetCounts[target] || 0) + 1
      }
    }

    return Object.entries(targetCounts)
      .filter(([_, count]) => count > posts.length * 0.3)
      .map(([target]) => target)
      .slice(0, 5)
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@([^\s@:：,，]+)/g
    const mentions: string[] = []
    let match: RegExpExecArray | null

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match[1]) {
        mentions.push(String(match[1]))
      }
    }

    return mentions
  }
}

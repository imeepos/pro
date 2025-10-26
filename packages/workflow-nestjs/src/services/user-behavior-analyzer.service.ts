import { Injectable } from '@nestjs/common'
import type { UserPostSummary, UserBehaviorFeatures } from '../types/user-profile.types'

@Injectable()
export class UserBehaviorAnalyzerService {
  analyzeUserBehavior(
    posts: UserPostSummary[],
    accountCreatedAt?: string
  ): UserBehaviorFeatures {
    if (!posts || posts.length === 0) {
      return this.emptyFeatures()
    }

    const postsPerDay = this.calculatePostsPerDay(posts, accountCreatedAt)
    const postingTimeDistribution = this.analyzePostingTime(posts)
    const deviceDistribution = this.analyzeDevices(posts)
    const contentSimilarity = this.calculateContentSimilarity(posts)
    const interactionRatio = this.calculateInteractionRatio(posts)

    return {
      postsPerDay,
      postingTimeDistribution,
      deviceDistribution,
      contentSimilarity,
      interactionRatio
    }
  }

  private calculatePostsPerDay(posts: UserPostSummary[], accountCreatedAt?: string): number {
    if (posts.length === 0) return 0

    const sortedPosts = [...posts].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const firstPostDate = sortedPosts[0]?.createdAt
    const lastPostDate = sortedPosts[sortedPosts.length - 1]?.createdAt

    if (!firstPostDate || !lastPostDate) return 0

    const firstPost = new Date(firstPostDate)
    const lastPost = new Date(lastPostDate)

    const startDate = accountCreatedAt
      ? new Date(Math.max(new Date(accountCreatedAt).getTime(), firstPost.getTime()))
      : firstPost

    const daysDiff = Math.max(1, (lastPost.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    return Number((posts.length / daysDiff).toFixed(2))
  }

  private analyzePostingTime(posts: UserPostSummary[]) {
    const distribution = { morning: 0, afternoon: 0, evening: 0, night: 0 }

    posts.forEach(post => {
      const hour = new Date(post.createdAt).getHours()

      if (hour >= 6 && hour < 12) {
        distribution.morning++
      } else if (hour >= 12 && hour < 18) {
        distribution.afternoon++
      } else if (hour >= 18 && hour < 24) {
        distribution.evening++
      } else {
        distribution.night++
      }
    })

    const total = posts.length
    return {
      morning: Number((distribution.morning / total).toFixed(2)),
      afternoon: Number((distribution.afternoon / total).toFixed(2)),
      evening: Number((distribution.evening / total).toFixed(2)),
      night: Number((distribution.night / total).toFixed(2))
    }
  }

  private analyzeDevices(posts: UserPostSummary[]): Record<string, number> {
    const devices: Record<string, number> = {}

    posts.forEach(post => {
      const source = this.normalizeDeviceSource(post.source)
      devices[source] = (devices[source] || 0) + 1
    })

    const total = posts.length
    const distribution: Record<string, number> = {}

    for (const [device, count] of Object.entries(devices)) {
      distribution[device] = Number((count / total).toFixed(2))
    }

    return distribution
  }

  private normalizeDeviceSource(source: string | undefined): string {
    const safeSource = source ?? 'unknown'
    if (!safeSource || safeSource === 'unknown') return 'unknown'

    const lower = safeSource.toLowerCase()

    if (lower.includes('iphone')) return 'iPhone'
    if (lower.includes('android')) return 'Android'
    if (lower.includes('ipad')) return 'iPad'
    if (lower.includes('mac')) return 'Mac'
    if (lower.includes('windows')) return 'Windows'
    if (lower.includes('web') || lower.includes('网页')) return 'Web'

    return 'other'
  }

  private calculateContentSimilarity(posts: UserPostSummary[]): number {
    if (posts.length < 2) return 0

    const texts = posts.map(p => p.text.trim().toLowerCase())
    let similarPairs = 0
    let totalPairs = 0

    for (let i = 0; i < texts.length; i++) {
      const text1 = texts[i]
      if (!text1) continue

      for (let j = i + 1; j < Math.min(i + 11, texts.length); j++) {
        const text2 = texts[j]
        if (!text2) continue

        totalPairs++
        if (this.isSimilarText(text1, text2)) {
          similarPairs++
        }
      }
    }

    return totalPairs > 0 ? Number((similarPairs / totalPairs).toFixed(2)) : 0
  }

  private isSimilarText(text1: string, text2: string): boolean {
    if (text1 === text2) return true

    const minLength = Math.min(text1.length, text2.length)
    if (minLength < 10) return false

    const words1 = new Set(text1.split(/\s+/))
    const words2 = new Set(text2.split(/\s+/))

    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])

    const similarity = intersection.size / union.size
    return similarity > 0.6
  }

  private calculateInteractionRatio(posts: UserPostSummary[]): number {
    if (posts.length === 0) return 0

    const originalPosts = posts.filter(p => !this.isRepost(p.text))
    return Number((originalPosts.length / posts.length).toFixed(2))
  }

  private isRepost(text: string): boolean {
    return text.startsWith('//@') || text.includes('转发微博')
  }

  private emptyFeatures(): UserBehaviorFeatures {
    return {
      postsPerDay: 0,
      postingTimeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      deviceDistribution: {},
      contentSimilarity: 0,
      interactionRatio: 0
    }
  }
}

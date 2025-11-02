export interface UserProfileData {
  userId: string
  nickname: string
  verified: boolean
  verifiedReason?: string
  followersCount: number
  friendsCount: number
  statusesCount: number
  description?: string
  location?: string
  createdAt?: string
  profileImageUrl?: string
  coverImageUrl?: string
  svip?: number
  vvip?: number
  userType?: number
}

export interface UserPostSummary {
  statusId: string
  text: string
  createdAt: string
  repostsCount: number
  commentsCount: number
  attitudesCount: number
  source?: string
}

export interface UserBehaviorFeatures {
  postsPerDay: number
  postingTimeDistribution: {
    morning: number
    afternoon: number
    evening: number
    night: number
  }
  deviceDistribution: Record<string, number>
  contentSimilarity: number
  interactionRatio: number
}

export interface DetectionResult {
  isSuspicious: boolean
  confidence: number
  reasons: string[]
}

export interface UserProfileWorkflowData {
  profile: UserProfileData
  recentPosts: UserPostSummary[]
  behaviorFeatures: UserBehaviorFeatures
  botDetection: DetectionResult
  spamDetection: DetectionResult
}

export interface UserProfileWorkflowInput {
  userId: string | string[]
  maxPostPages?: number
}

export interface UserProfileWorkflowOutput {
  success: boolean
  results: Array<{
    userId: string
    rawDataId?: string
    isBotSuspect: boolean
    isSpammerSuspect: boolean
    error?: string
  }>
}

export interface UserProfileWorkflowConfig {
  maxPostPages: number
  botDetectionThresholds: {
    maxPostsPerDay: number
    minFollowers: number
    maxFollowing: number
    minSimilarity: number
    maxAccountAgeDays: number
    minPostsForNewAccount: number
  }
  spamKeywords: string[]
  queueConcurrency: number
  cacheTTL: number
}

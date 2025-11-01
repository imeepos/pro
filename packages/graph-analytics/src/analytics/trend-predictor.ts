import { GraphSnapshot } from '../types.js'

export interface TrendOptions {
  recentWindowHours?: number
  lookbackWindowHours?: number
  minimumWeight?: number
}

export interface CommunityTrendSummary {
  communityId: string
  members: string[]
  totalWeight: number
  recentWeight: number
  historicalWeight: number
  momentum: number
  lastInteractionAt: Date | null
}

const DEFAULT_OPTIONS: Required<TrendOptions> = {
  recentWindowHours: 24,
  lookbackWindowHours: 168,
  minimumWeight: 0.01,
}

const toHours = (milliseconds: number): number => milliseconds / (1000 * 60 * 60)

const decayFactor = (ageHours: number, windowHours: number): number => {
  if (windowHours <= 0) {
    return 0
  }
  if (ageHours <= 0) {
    return 1
  }
  return Math.max(0, 1 - ageHours / windowHours)
}

export class TrendPredictor {
  private readonly options: Required<TrendOptions>

  constructor(options: TrendOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  evaluateCommunities(
    snapshot: GraphSnapshot,
    assignments: Map<string, string>,
    referenceTime: Date = new Date(),
  ): CommunityTrendSummary[] {
    const membersByCommunity = new Map<string, Set<string>>()
    assignments.forEach((communityId, nodeId) => {
      if (!membersByCommunity.has(communityId)) {
        membersByCommunity.set(communityId, new Set())
      }
      membersByCommunity.get(communityId)!.add(nodeId)
    })

    const summaries = new Map<string, CommunityTrendSummary>()

    snapshot.edges.forEach((edge) => {
      const communityA = assignments.get(edge.source)
      const communityB = assignments.get(edge.target)
      if (!communityA || !communityB) {
        return
      }

      const communities = communityA === communityB ? [communityA] : [communityA, communityB]
      communities.forEach((communityId) => {
        if (!summaries.has(communityId)) {
          summaries.set(communityId, {
            communityId,
            members: [...(membersByCommunity.get(communityId)?.values() ?? [])],
            totalWeight: 0,
            recentWeight: 0,
            historicalWeight: 0,
            momentum: 0,
            lastInteractionAt: null,
          })
        }

        const summary = summaries.get(communityId)!
        summary.totalWeight += edge.weight
        const lastSeen = edge.evidence.lastSeenAt
        const firstSeen = edge.evidence.firstSeenAt
        if (!summary.lastInteractionAt || (lastSeen && lastSeen > summary.lastInteractionAt)) {
          summary.lastInteractionAt = lastSeen ?? summary.lastInteractionAt
        }

        if (lastSeen) {
          const recentAge = toHours(referenceTime.getTime() - lastSeen.getTime())
          const recentContribution = edge.weight * decayFactor(recentAge, this.options.recentWindowHours)
          summary.recentWeight += recentContribution
        }

        if (firstSeen) {
          const historicalAge = toHours(referenceTime.getTime() - firstSeen.getTime())
          const historicalBoundary = Math.max(
            this.options.recentWindowHours,
            this.options.lookbackWindowHours,
          )
          const historicalContribution = edge.weight * decayFactor(historicalAge, historicalBoundary)
          summary.historicalWeight += historicalContribution
        } else {
          summary.historicalWeight += edge.weight
        }
      })
    })

    summaries.forEach((summary) => {
      if (summary.totalWeight < this.options.minimumWeight) {
        summary.momentum = 0
        return
      }
      const baseline = summary.historicalWeight - summary.recentWeight
      const denominator = Math.max(baseline, this.options.minimumWeight)
      summary.momentum = (summary.recentWeight - baseline) / denominator
    })

    return [...summaries.values()].sort((a, b) => b.momentum - a.momentum)
  }
}

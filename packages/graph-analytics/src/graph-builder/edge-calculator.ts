import {
  WeiboCommentEntity,
  WeiboInteractionEntity,
  WeiboLikeEntity,
  WeiboPostHashtagEntity,
  WeiboPostMentionEntity,
  WeiboRepostEntity,
  WeiboInteractionType,
} from '@pro/entities'
import { GraphEdge, GraphEdgeKind, PostGraphNode } from '../types.js'
import { GraphNodeRegistry } from './node-extractor.js'

type MutableEdgeMetadata = Record<string, Set<string>>

interface EdgeAccumulatorState {
  key: string
  kind: GraphEdgeKind
  source: string
  target: string
  weight: number
  evidence: {
    firstSeenAt: Date | null
    lastSeenAt: Date | null
    occurrences: number
    scoreContributions: number[]
  }
  metadata: MutableEdgeMetadata
}

export interface EdgeWeightSettings {
  baseWeight: number
  halfLifeHours: number
}

export type EdgeWeightConfig = Record<GraphEdgeKind, EdgeWeightSettings>

export interface PostReplyReference {
  sourcePostId: string
  targetPostId: string
  occurredAt?: Date | string | null
}

export interface EdgeCalculationInput {
  registry: GraphNodeRegistry
  mentions?: WeiboPostMentionEntity[]
  postHashtags?: WeiboPostHashtagEntity[]
  likes?: WeiboLikeEntity[]
  interactions?: WeiboInteractionEntity[]
  reposts?: WeiboRepostEntity[]
  comments?: WeiboCommentEntity[]
  postReplies?: PostReplyReference[]
  evaluationTime?: Date
}

const DEFAULT_EDGE_WEIGHTS: EdgeWeightConfig = {
  mention: { baseWeight: 1, halfLifeHours: 48 },
  repost: { baseWeight: 1.2, halfLifeHours: 72 },
  comment: { baseWeight: 0.9, halfLifeHours: 36 },
  like: { baseWeight: 0.5, halfLifeHours: 24 },
  author: { baseWeight: 2, halfLifeHours: 720 },
  has_hashtag: { baseWeight: 0.7, halfLifeHours: 168 },
  reply_to: { baseWeight: 1.1, halfLifeHours: 96 },
  interact: { baseWeight: 1.4, halfLifeHours: 60 },
}

const roundTo = (value: number, precision = 6): number =>
  Number.isFinite(value) ? Number.parseFloat(value.toFixed(precision)) : 0

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return value
  }
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

class EdgeAccumulator {
  private readonly bucket = new Map<string, EdgeAccumulatorState>()

  constructor(
    private readonly weights: EdgeWeightConfig,
    private readonly evaluationTime: Date,
  ) {}

  add(kind: GraphEdgeKind, source: string, target: string, occurredAt: Date | null, metadata: MutableEdgeMetadata = {}): void {
    const key = `${kind}|${source}|${target}`
    const weight = this.computeWeight(kind, occurredAt)

    let state = this.bucket.get(key)
    if (!state) {
      state = {
        key,
        kind,
        source,
        target,
        weight: 0,
        evidence: {
          firstSeenAt: occurredAt,
          lastSeenAt: occurredAt,
          occurrences: 0,
          scoreContributions: [],
        },
        metadata: {},
      }
      this.bucket.set(key, state)
    }

    state.weight = roundTo(state.weight + weight)
    state.evidence.occurrences += 1
    state.evidence.scoreContributions.push(roundTo(weight))

    if (!state.evidence.firstSeenAt || (occurredAt && occurredAt < state.evidence.firstSeenAt)) {
      state.evidence.firstSeenAt = occurredAt
    }
    if (!state.evidence.lastSeenAt || (occurredAt && occurredAt > state.evidence.lastSeenAt)) {
      state.evidence.lastSeenAt = occurredAt
    }

    Object.entries(metadata).forEach(([metaKey, newValues]) => {
      if (!state!.metadata[metaKey]) {
        state!.metadata[metaKey] = new Set()
      }
      newValues.forEach((value) => state!.metadata[metaKey].add(value))
    })
  }

  build(): GraphEdge[] {
    return [...this.bucket.values()].map((state) => ({
      kind: state.kind,
      source: state.source,
      target: state.target,
      weight: roundTo(state.weight),
      evidence: {
        firstSeenAt: state.evidence.firstSeenAt ?? null,
        lastSeenAt: state.evidence.lastSeenAt ?? null,
        occurrences: state.evidence.occurrences,
        scoreContributions: state.evidence.scoreContributions.map((value) => roundTo(value, 8)),
      },
      metadata: Object.fromEntries(
        Object.entries(state.metadata).map(([metaKey, values]) => [metaKey, [...values].sort()]),
      ),
    }))
  }

  private computeWeight(kind: GraphEdgeKind, occurredAt: Date | null): number {
    const config = this.weights[kind] ?? DEFAULT_EDGE_WEIGHTS[kind]
    const base = config?.baseWeight ?? 1
    if (!occurredAt) {
      return base
    }

    const diffInHours = Math.abs(this.evaluationTime.getTime() - occurredAt.getTime()) / (1000 * 60 * 60)
    const halfLife = config?.halfLifeHours ?? 24
    const decayFactor = halfLife > 0 ? Math.pow(0.5, diffInHours / halfLife) : 1
    return roundTo(base * decayFactor, 8)
  }
}

export class WeiboEdgeCalculator {
  constructor(private readonly weights: EdgeWeightConfig = DEFAULT_EDGE_WEIGHTS) {}

  calculate(input: EdgeCalculationInput): GraphEdge[] {
    const evaluationTime = input.evaluationTime ?? new Date()
    const accumulator = new EdgeAccumulator(this.weights, evaluationTime)
    const { registry } = input

    this.attachAuthorEdges(registry, accumulator)
    this.attachMentionEdges(registry, accumulator, input.mentions ?? [])
    this.attachHashtagEdges(registry, accumulator, input.postHashtags ?? [])

    const interactions = input.interactions ?? []
    if (interactions.length > 0) {
      this.attachInteractionEdges(registry, accumulator, interactions)
    } else {
      this.attachLikeEdges(registry, accumulator, input.likes ?? [])
      this.attachRepostEdges(registry, accumulator, input.reposts ?? [])
      this.attachCommentEdges(registry, accumulator, input.comments ?? [])
    }

    this.attachReplyEdges(registry, accumulator, input.postReplies ?? [])

    return accumulator.build()
  }

  private attachAuthorEdges(registry: GraphNodeRegistry, accumulator: EdgeAccumulator): void {
    registry.valuesByKind('post').forEach((node) => {
      if (node.kind !== 'post') {
        return
      }
      const authorId = node.attributes.authorId
      if (!authorId || authorId === 'unknown') {
        return
      }
      registry.ensureUser(authorId)
      accumulator.add('author', authorId, node.id, node.attributes.createdAt, { posts: new Set([node.id]) })
    })
  }

  private attachMentionEdges(
    registry: GraphNodeRegistry,
    accumulator: EdgeAccumulator,
    mentions: WeiboPostMentionEntity[],
  ): void {
    mentions.forEach((mention) => {
      const postId = mention.postId.toString()
      const mentionedId = mention.mentionedId.toString()
      const authorId = registry.authorOf(postId)
      if (!authorId) {
        return
      }
      const occurredAt = registry.createdAtOf(postId)
      registry.ensureUser(mentionedId)

      accumulator.add('mention', authorId, mentionedId, occurredAt, { posts: new Set([postId]) })
    })
  }

  private attachHashtagEdges(
    registry: GraphNodeRegistry,
    accumulator: EdgeAccumulator,
    postHashtags: WeiboPostHashtagEntity[],
  ): void {
    postHashtags.forEach((link) => {
      const postId = link.postId.toString()
      const hashtagId = link.hashtagId.toString()
      registry.incrementHashtagUsage(hashtagId)
      const postNode = registry.getNode<PostGraphNode>(postId)
      if (!postNode || postNode.kind !== 'post') {
        return
      }
      registry.ensureHashtag(hashtagId)
      const occurredAt = postNode.attributes.createdAt ?? registry.createdAtOf(postId)
      accumulator.add('has_hashtag', postId, hashtagId, occurredAt, { posts: new Set([postId]) })
    })
  }

  private attachInteractionEdges(
    registry: GraphNodeRegistry,
    accumulator: EdgeAccumulator,
    interactions: WeiboInteractionEntity[],
  ): void {
    interactions.forEach((interaction) => {
      const actorId = interaction.userWeiboId?.toString()
      const targetPostId = interaction.targetWeiboId?.toString()
      if (!actorId || !targetPostId) {
        return
      }

      const authorId = registry.authorOf(targetPostId)
      if (!authorId || authorId === actorId) {
        return
      }

      registry.ensureUser(actorId)
      registry.ensureUser(authorId)
      const occurredAt = interaction.createdAt ?? registry.createdAtOf(targetPostId)
      const metadata = {
        interactionTypes: new Set([interaction.interactionType]),
        posts: new Set([targetPostId]),
      }
      accumulator.add('interact', actorId, authorId, occurredAt, metadata)

      switch (interaction.interactionType) {
        case WeiboInteractionType.Comment:
          accumulator.add('comment', actorId, targetPostId, occurredAt, metadata)
          break
        case WeiboInteractionType.Repost:
          accumulator.add('repost', actorId, targetPostId, occurredAt, metadata)
          break
        case WeiboInteractionType.Like:
          accumulator.add('like', actorId, targetPostId, occurredAt, metadata)
          break
        case WeiboInteractionType.Favorite:
          accumulator.add('like', actorId, targetPostId, occurredAt, metadata)
          break
        default:
          break
      }
    })
  }

  private attachLikeEdges(
    registry: GraphNodeRegistry,
    accumulator: EdgeAccumulator,
    likes: WeiboLikeEntity[],
  ): void {
    likes.forEach((like) => {
      const userId = like.userWeiboId.toString()
      const postId = like.targetWeiboId.toString()
      registry.ensureUser(userId)
      const occurredAt = like.createdAt ?? registry.createdAtOf(postId)
      accumulator.add('like', userId, postId, occurredAt, { posts: new Set([postId]) })
    })
  }

  private attachRepostEdges(
    registry: GraphNodeRegistry,
    accumulator: EdgeAccumulator,
    reposts: WeiboRepostEntity[],
  ): void {
    reposts.forEach((repost) => {
      const rawUser = repost.user as { id?: number | string } | null
      const userId = rawUser?.id?.toString()
      const targetPostId = repost.mblogid?.toString()
      if (!userId || !targetPostId) {
        return
      }
      registry.ensureUser(userId)
      accumulator.add('repost', userId, targetPostId, repost.created_at ?? registry.createdAtOf(targetPostId), {
        posts: new Set([targetPostId]),
      })
    })
  }

  private attachCommentEdges(
    registry: GraphNodeRegistry,
    accumulator: EdgeAccumulator,
    comments: WeiboCommentEntity[],
  ): void {
    comments.forEach((comment) => {
      const userSnapshot = comment.user as { id?: number | string } | null
      const userId = userSnapshot?.id?.toString()
      const targetPostId = comment.rootid?.toString()
      if (!userId || !targetPostId) {
        return
      }
      registry.ensureUser(userId)
      const occurredAt = asDate(comment.created_at) ?? registry.createdAtOf(targetPostId)
      accumulator.add('comment', userId, targetPostId, occurredAt, { posts: new Set([targetPostId]) })
    })
  }

  private attachReplyEdges(
    registry: GraphNodeRegistry,
    accumulator: EdgeAccumulator,
    replies: PostReplyReference[],
  ): void {
    replies.forEach((reply) => {
      const sourcePostId = reply.sourcePostId.toString()
      const targetPostId = reply.targetPostId.toString()
      const occurredAt = asDate(reply.occurredAt) ?? registry.createdAtOf(sourcePostId)
      accumulator.add('reply_to', sourcePostId, targetPostId, occurredAt, {
        posts: new Set([sourcePostId, targetPostId]),
      })
    })
  }
}

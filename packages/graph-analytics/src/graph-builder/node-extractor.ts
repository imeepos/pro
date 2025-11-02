import {
  WeiboHashtagEntity,
  WeiboPostEntity,
  WeiboUserEntity,
} from '@pro/entities'
import {
  GraphNode,
  GraphNodeKind,
  HashtagGraphNode,
  HashtagNodeAttributes,
  PostGraphNode,
  PostNodeAttributes,
  UserGraphNode,
  UserNodeAttributes,
} from '../types.js'

export interface NodeExtractionSource {
  users?: WeiboUserEntity[]
  posts?: WeiboPostEntity[]
  hashtags?: WeiboHashtagEntity[]
}

const asInteger = (value: number | string | null | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const parseDate = (input: string | null | undefined): Date | null => {
  if (!input) {
    return null
  }
  const timestamp = Date.parse(input)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

const roundTo = (value: number, precision = 6): number =>
  Number.isFinite(value) ? Number.parseFloat(value.toFixed(precision)) : 0

export class GraphNodeRegistry {
  private readonly nodes = new Map<string, GraphNode>()

  private readonly nodesByKind = new Map<GraphNodeKind, Map<string, GraphNode>>([
    ['user', new Map()],
    ['post', new Map()],
    ['hashtag', new Map()],
    ['cluster', new Map()],
  ])

  private readonly postAuthor = new Map<string, string>()
  private readonly postTimestamp = new Map<string, Date | null>()

  constructor() {}

  upsertUser(
    entity: Partial<Omit<WeiboUserEntity, 'id'>> & { id: number | string },
  ): UserGraphNode {
    const id = entity.id.toString()
    const existing = this.nodes.get(id)
    if (existing && existing.kind === 'user' && !existing.placeholder) {
      return existing
    }

    const followerCount = asInteger(entity.followers_count ?? (existing?.kind === 'user' ? existing.attributes.followerCount : 0))
    const followCount = asInteger(entity.friends_count ?? (existing?.kind === 'user' ? existing.attributes.followCount : 0))
    const statusesCount = asInteger(entity.statuses_count ?? (existing?.kind === 'user' ? existing.attributes.statusesCount : 0))
    const mutualCount = asInteger(
      'bi_followers_count' in entity
        ? (entity as WeiboUserEntity).bi_followers_count
        : existing && existing.kind === 'user'
          ? existing.attributes.reciprocityIndex * (followerCount + followCount)
          : 0,
    )

    const followerScore = Math.log10(followerCount + 1)
    const activityScore = Math.log10(statusesCount + 1)
    const reciprocityDenominator = followerCount + followCount || 1
    const reciprocityIndex = reciprocityDenominator === 0 ? 0 : roundTo(mutualCount / reciprocityDenominator)

    const attributes: UserNodeAttributes = {
      displayName:
        entity.screen_name ??
        entity.name ??
        (existing && existing.kind === 'user' ? existing.attributes.displayName : id),
      verified: Boolean(entity.verified ?? (existing && existing.kind === 'user' ? existing.attributes.verified : false)),
      followerCount,
      followCount,
      statusesCount,
      residence:
        'location' in entity && entity.location !== undefined
          ? entity.location
          : existing && existing.kind === 'user'
            ? existing.attributes.residence ?? null
            : null,
      influenceSeed: roundTo(followerScore * 0.7 + activityScore * 0.3),
      reciprocityIndex,
    }

    const node: UserGraphNode = {
      id,
      kind: 'user',
      attributes,
      placeholder: false,
    }

    this.registerNode(node)
    return node
  }

  registerPost(entity: WeiboPostEntity): PostGraphNode {
    const id = entity.id.toString()
    const createdAt = parseDate(entity.created_at)
    const authorId = entity.user?.id?.toString()
    const attributes: PostNodeAttributes = {
      authorId: authorId ?? 'unknown',
      createdAt,
      textLength: asInteger(entity.textLength),
      reposts: asInteger(entity.reposts_count),
      comments: asInteger(entity.comments_count),
      likes: asInteger(entity.attitudes_count),
      visibility: entity.visible?.type !== undefined ? String(entity.visible.type) : 'unknown',
    }

    const node: PostGraphNode = {
      id,
      kind: 'post',
      attributes,
      placeholder: false,
    }

    this.registerNode(node)
    if (authorId) {
      this.postAuthor.set(id, authorId)
    }
    this.postTimestamp.set(id, createdAt)
    if (authorId) {
      this.upsertUser({ id: authorId })
    }
    return node
  }

  registerHashtag(entity: WeiboHashtagEntity, usageCount = 0): HashtagGraphNode {
    const id = entity.tagId
    const existing = this.nodes.get(id)
    const usageBaseline =
      existing && existing.kind === 'hashtag'
        ? existing.attributes.usageCount
        : 0
    const attributes: HashtagNodeAttributes = {
      tag: entity.tagName,
      tagType: entity.tagType,
      hidden: Boolean(entity.tagHidden),
      description: entity.description,
      usageCount: usageCount || usageBaseline,
    }

    const node: HashtagGraphNode = {
      id,
      kind: 'hashtag',
      attributes,
      placeholder: false,
    }

    this.registerNode(node)
    return node
  }

  ensureUser(id: string): UserGraphNode {
    const existing = this.nodes.get(id)
    if (existing && existing.kind === 'user') {
      return existing
    }

    const node: UserGraphNode = {
      id,
      kind: 'user',
      attributes: {
        displayName: id,
        verified: false,
        followerCount: 0,
        followCount: 0,
        statusesCount: 0,
        residence: null,
        influenceSeed: 0,
        reciprocityIndex: 0,
      },
      placeholder: true,
    }
    this.registerNode(node)
    return node
  }

  values(): GraphNode[] {
    return [...this.nodes.values()]
  }

  valuesByKind(kind: GraphNodeKind): GraphNode[] {
    const bucket = this.nodesByKind.get(kind)
    return bucket ? [...bucket.values()] : []
  }

  authorOf(postId: string): string | undefined {
    return this.postAuthor.get(postId)
  }

  createdAtOf(postId: string): Date | null {
    return this.postTimestamp.get(postId) ?? null
  }

  getNode<T extends GraphNode = GraphNode>(id: string): T | undefined {
    return this.nodes.get(id) as T | undefined
  }

  ensureHashtag(id: string): HashtagGraphNode {
    const existing = this.nodes.get(id)
    if (existing && existing.kind === 'hashtag') {
      return existing
    }

    const node: HashtagGraphNode = {
      id,
      kind: 'hashtag',
      attributes: {
        tag: id,
        hidden: false,
        usageCount: 0,
        description: null,
      },
      placeholder: true,
    }

    this.registerNode(node)
    return node
  }

  incrementHashtagUsage(id: string, delta = 1): void {
    const node = this.ensureHashtag(id)
    node.attributes.usageCount = node.attributes.usageCount + delta
  }

  private registerNode<T extends GraphNode>(node: T): void {
    this.nodes.set(node.id, node)
    const bucket = this.nodesByKind.get(node.kind)
    if (bucket) {
      bucket.set(node.id, node)
    }
  }
}

export class WeiboNodeExtractor {
  constructor(private readonly registry = new GraphNodeRegistry()) {}

  extract(source: NodeExtractionSource): GraphNodeRegistry {
    source.users?.forEach((user) => {
      this.registry.upsertUser(user)
    })

    source.posts?.forEach((post) => {
      this.registry.registerPost(post)
    })

    source.hashtags?.forEach((hashtag) => {
      this.registry.registerHashtag(hashtag)
    })

    return this.registry
  }
}

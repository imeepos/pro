export type GraphNodeKind = 'user' | 'post' | 'hashtag' | 'cluster'

export interface UserNodeAttributes {
  displayName: string
  verified: boolean
  followerCount: number
  followCount: number
  statusesCount: number
  residence?: string | null
  influenceSeed: number
  reciprocityIndex: number
}

export interface PostNodeAttributes {
  authorId: string
  createdAt: Date | null
  textLength: number
  reposts: number
  comments: number
  likes: number
  visibility: string
}

export interface HashtagNodeAttributes {
  tag: string
  tagType?: number | null
  hidden: boolean
  description?: string | null
  usageCount: number
}

export interface ClusterNodeAttributes {
  label: string
  memberIds: string[]
  summary: string
}

interface BaseGraphNode<TKind extends GraphNodeKind, TAttributes> {
  id: string
  kind: TKind
  attributes: TAttributes
  placeholder?: boolean
}

export type UserGraphNode = BaseGraphNode<'user', UserNodeAttributes>
export type PostGraphNode = BaseGraphNode<'post', PostNodeAttributes>
export type HashtagGraphNode = BaseGraphNode<'hashtag', HashtagNodeAttributes>
export type ClusterGraphNode = BaseGraphNode<'cluster', ClusterNodeAttributes>

export type GraphNode =
  | UserGraphNode
  | PostGraphNode
  | HashtagGraphNode
  | ClusterGraphNode

export type GraphEdgeKind =
  | 'mention'
  | 'repost'
  | 'comment'
  | 'like'
  | 'author'
  | 'has_hashtag'
  | 'reply_to'
  | 'interact'

export interface EdgeEvidence {
  firstSeenAt: Date | null
  lastSeenAt: Date | null
  occurrences: number
  scoreContributions: number[]
}

export interface GraphEdge<TKind extends GraphEdgeKind = GraphEdgeKind> {
  kind: TKind
  source: string
  target: string
  weight: number
  evidence: EdgeEvidence
  metadata?: Record<string, unknown>
}

export interface GraphSnapshot {
  nodes: GraphNode[]
  edges: GraphEdge[]
  adjacency: Map<string, GraphEdge[]>
  generatedAt: Date
}

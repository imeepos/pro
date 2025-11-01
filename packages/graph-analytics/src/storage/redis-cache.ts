import { GraphEdge, GraphSnapshot } from '../types.js'

export interface RedisLike {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<'OK' | null>
  expire(key: string, seconds: number): Promise<number>
}

export interface GraphCacheOptions {
  prefix?: string
  ttlSeconds?: number
}

type PersistedEdge = Omit<GraphEdge, 'evidence'> & {
  evidence: {
    firstSeenAt: string | null
    lastSeenAt: string | null
    occurrences: number
    scoreContributions: number[]
  }
}

interface PersistedSnapshot {
  generatedAt: string
  nodes: GraphSnapshot['nodes']
  edges: PersistedEdge[]
}

const serializeEdge = (edge: GraphEdge): PersistedEdge => ({
  ...edge,
  evidence: {
    ...edge.evidence,
    firstSeenAt: edge.evidence.firstSeenAt ? edge.evidence.firstSeenAt.toISOString() : null,
    lastSeenAt: edge.evidence.lastSeenAt ? edge.evidence.lastSeenAt.toISOString() : null,
  },
})

const deserializeEdge = (edge: PersistedEdge): GraphEdge => ({
  ...edge,
  evidence: {
    ...edge.evidence,
    firstSeenAt: edge.evidence.firstSeenAt ? new Date(edge.evidence.firstSeenAt) : null,
    lastSeenAt: edge.evidence.lastSeenAt ? new Date(edge.evidence.lastSeenAt) : null,
  },
})

const rebuildAdjacency = (edges: GraphEdge[]): Map<string, GraphEdge[]> => {
  const adjacency = new Map<string, GraphEdge[]>()
  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, [])
    }
    adjacency.get(edge.source)!.push(edge)
  })
  return adjacency
}

export class GraphSnapshotCache {
  private readonly redis: RedisLike
  private readonly prefix: string
  private readonly ttlSeconds: number

  constructor(redis: RedisLike, options: GraphCacheOptions = {}) {
    this.redis = redis
    this.prefix = options.prefix ?? 'graph:snapshot'
    this.ttlSeconds = options.ttlSeconds ?? 3600
  }

  async store(key: string, snapshot: GraphSnapshot): Promise<void> {
    const payload: PersistedSnapshot = {
      generatedAt: snapshot.generatedAt.toISOString(),
      nodes: snapshot.nodes,
      edges: snapshot.edges.map(serializeEdge),
    }
    const cacheKey = this.composeKey(key)
    await this.redis.set(cacheKey, JSON.stringify(payload))
    if (this.ttlSeconds > 0) {
      await this.redis.expire(cacheKey, this.ttlSeconds)
    }
  }

  async retrieve(key: string): Promise<GraphSnapshot | null> {
    const cacheKey = this.composeKey(key)
    const payload = await this.redis.get(cacheKey)
    if (!payload) {
      return null
    }

    const parsed = JSON.parse(payload) as PersistedSnapshot
    const edges = parsed.edges.map(deserializeEdge)
    return {
      nodes: parsed.nodes,
      edges,
      adjacency: rebuildAdjacency(edges),
      generatedAt: new Date(parsed.generatedAt),
    }
  }

  private composeKey(key: string): string {
    return `${this.prefix}:${key}`
  }
}

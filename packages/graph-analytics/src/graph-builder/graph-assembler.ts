import {
  WeiboCommentEntity,
  WeiboInteractionEntity,
  WeiboLikeEntity,
  WeiboPostHashtagEntity,
  WeiboPostMentionEntity,
  WeiboRepostEntity,
} from '@pro/entities'
import { GraphSnapshot, GraphEdge, GraphNode } from '../types.js'
import { GraphNodeRegistry, NodeExtractionSource, WeiboNodeExtractor } from './node-extractor.js'
import {
  EdgeCalculationInput,
  PostReplyReference,
  WeiboEdgeCalculator,
} from './edge-calculator.js'

export interface GraphAssemblyInput extends NodeExtractionSource {
  mentions?: WeiboPostMentionEntity[]
  postHashtags?: WeiboPostHashtagEntity[]
  likes?: WeiboLikeEntity[]
  interactions?: WeiboInteractionEntity[]
  reposts?: WeiboRepostEntity[]
  comments?: WeiboCommentEntity[]
  postReplies?: PostReplyReference[]
  evaluationTime?: Date
}

export interface GraphAssemblyResult extends GraphSnapshot {
  registry: GraphNodeRegistry
}

const sortNodes = (nodes: GraphNode[]): GraphNode[] => {
  const order: Record<string, number> = { user: 0, post: 1, hashtag: 2, cluster: 3 }
  return [...nodes].sort((a, b) => {
    if (a.kind === b.kind) {
      return a.id.localeCompare(b.id)
    }
    return (order[a.kind] ?? 99) - (order[b.kind] ?? 99)
  })
}

const sortEdges = (edges: GraphEdge[]): GraphEdge[] =>
  [...edges].sort((a, b) => {
    if (b.weight === a.weight) {
      if (a.kind === b.kind) {
        const sourceComparison = a.source.localeCompare(b.source)
        return sourceComparison !== 0 ? sourceComparison : a.target.localeCompare(b.target)
      }
      return a.kind.localeCompare(b.kind)
    }
    return b.weight - a.weight
  })

export class GraphAssembler {
  constructor(
    private readonly nodeExtractor = new WeiboNodeExtractor(),
    private readonly edgeCalculator = new WeiboEdgeCalculator(),
  ) {}

  assemble(input: GraphAssemblyInput): GraphAssemblyResult {
    const { users, posts, hashtags, evaluationTime, ...rest } = input

    const registry = this.nodeExtractor.extract({
      users,
      posts,
      hashtags,
    })

    const edgeInput: EdgeCalculationInput = {
      ...rest,
      registry,
      evaluationTime,
    }

    const edges = sortEdges(this.edgeCalculator.calculate(edgeInput))
    const nodes = sortNodes(registry.values())
    const adjacency = this.buildAdjacency(edges)

    return {
      nodes,
      edges,
      adjacency,
      generatedAt: evaluationTime ?? new Date(),
      registry,
    }
  }

  private buildAdjacency(edges: GraphEdge[]): Map<string, GraphEdge[]> {
    const adjacency = new Map<string, GraphEdge[]>()
    edges.forEach((edge) => {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, [])
      }
      adjacency.get(edge.source)!.push(edge)
    })
    return adjacency
  }
}

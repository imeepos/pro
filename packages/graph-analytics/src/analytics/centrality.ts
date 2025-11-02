import { GraphEdge, GraphSnapshot } from '../types.js'

export interface PageRankOptions {
  damping?: number
  iterations?: number
  tolerance?: number
}

export interface CentralityVector {
  outDegree: number
  inDegree: number
  outStrength: number
  inStrength: number
  pageRank: number
}

export interface CentralityReport {
  metrics: Map<string, CentralityVector>
  totalEdgeWeight: number
}

const DEFAULT_PAGERANK_OPTIONS: Required<PageRankOptions> = {
  damping: 0.85,
  iterations: 40,
  tolerance: 1e-6,
}

interface EdgeBuckets {
  outgoing: Map<string, GraphEdge[]>
  incoming: Map<string, GraphEdge[]>
}

const bucketEdges = (edges: GraphEdge[]): EdgeBuckets => {
  const outgoing = new Map<string, GraphEdge[]>()
  const incoming = new Map<string, GraphEdge[]>()

  edges.forEach((edge) => {
    if (!outgoing.has(edge.source)) {
      outgoing.set(edge.source, [])
    }
    outgoing.get(edge.source)!.push(edge)

    if (!incoming.has(edge.target)) {
      incoming.set(edge.target, [])
    }
    incoming.get(edge.target)!.push(edge)
  })

  return { outgoing, incoming }
}

const computeStrengthSum = (edges: GraphEdge[] | undefined): number =>
  edges?.reduce((total, edge) => total + edge.weight, 0) ?? 0

const initializePageRank = (nodes: string[]): Map<string, number> => {
  const value = 1 / Math.max(nodes.length, 1)
  return new Map(nodes.map((node) => [node, value]))
}

const iteratePageRank = (
  nodes: string[],
  buckets: EdgeBuckets,
  options: Required<PageRankOptions>,
): Map<string, number> => {
  const ranks = initializePageRank(nodes)
  const outStrengthCache = new Map<string, number>()

  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    let delta = 0
    const nextRanks = new Map<string, number>()

    nodes.forEach((node) => {
      const incomingEdges = buckets.incoming.get(node) ?? []
      let rankSum = 0

      incomingEdges.forEach((edge) => {
        if (!outStrengthCache.has(edge.source)) {
          outStrengthCache.set(edge.source, computeStrengthSum(buckets.outgoing.get(edge.source)))
        }
        const sourceStrength = outStrengthCache.get(edge.source) ?? 0
        if (sourceStrength === 0) {
          return
        }
        rankSum += (ranks.get(edge.source) ?? 0) * (edge.weight / sourceStrength)
      })

      const nextValue = (1 - options.damping) / nodes.length + options.damping * rankSum
      nextRanks.set(node, nextValue)
      delta += Math.abs(nextValue - (ranks.get(node) ?? 0))
    })

    nextRanks.forEach((value, node) => {
      ranks.set(node, value)
    })

    if (delta < options.tolerance) {
      break
    }
  }

  return ranks
}

export class CentralityAnalyzer {
  constructor(private readonly pagerankOptions: PageRankOptions = {}) {}

  analyze(snapshot: GraphSnapshot): CentralityReport {
    const nodes = snapshot.nodes.map((node) => node.id)
    const buckets = bucketEdges(snapshot.edges)
    const totalEdgeWeight = snapshot.edges.reduce((sum, edge) => sum + edge.weight, 0)
    const options: Required<PageRankOptions> = { ...DEFAULT_PAGERANK_OPTIONS, ...this.pagerankOptions }
    const pageRankScores = iteratePageRank(nodes, buckets, options)

    const metrics = new Map<string, CentralityVector>()
    nodes.forEach((node) => {
      const outgoingEdges = buckets.outgoing.get(node)
      const incomingEdges = buckets.incoming.get(node)
      metrics.set(node, {
        outDegree: outgoingEdges?.length ?? 0,
        inDegree: incomingEdges?.length ?? 0,
        outStrength: computeStrengthSum(outgoingEdges),
        inStrength: computeStrengthSum(incomingEdges),
        pageRank: pageRankScores.get(node) ?? 0,
      })
    })

    return {
      metrics,
      totalEdgeWeight,
    }
  }
}

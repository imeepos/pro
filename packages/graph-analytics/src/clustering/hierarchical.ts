import { GraphSnapshot } from '../types.js'

export interface HierarchicalOptions {
  targetClusters?: number
  maxLevels?: number
  minSimilarity?: number
}

export interface HierarchyMerge {
  from: string
  into: string
  weight: number
}

export interface HierarchyLevel {
  level: number
  assignments: Map<string, string>
  merged: HierarchyMerge[]
}

export interface HierarchicalResult {
  levels: HierarchyLevel[]
  finalAssignments: Map<string, string>
}

const DEFAULT_OPTIONS: Required<HierarchicalOptions> = {
  targetClusters: 8,
  maxLevels: 5,
  minSimilarity: 0.01,
}

const sortedKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

const cloneAssignments = (assignments: Map<string, string>): Map<string, string> =>
  new Map<string, string>(assignments)

const aggregateClusterSimilarities = (
  snapshot: GraphSnapshot,
  assignments: Map<string, string>,
): Map<string, number> => {
  const similarities = new Map<string, number>()
  snapshot.edges.forEach((edge) => {
    const clusterA = assignments.get(edge.source)
    const clusterB = assignments.get(edge.target)
    if (!clusterA || !clusterB || clusterA === clusterB) {
      return
    }
    const key = sortedKey(clusterA, clusterB)
    similarities.set(key, (similarities.get(key) ?? 0) + edge.weight)
  })
  return similarities
}

const uniqueClusterCount = (assignments: Map<string, string>): number =>
  new Set(assignments.values()).size

export class HierarchicalClusterer {
  private readonly options: Required<HierarchicalOptions>

  constructor(options: HierarchicalOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  run(snapshot: GraphSnapshot, seedAssignments?: Map<string, string>): HierarchicalResult {
    const assignments =
      seedAssignments && seedAssignments.size > 0
        ? cloneAssignments(seedAssignments)
        : this.bootstrap(snapshot)

    const levels: HierarchyLevel[] = []
    let level = 0

    while (
      level < this.options.maxLevels &&
      uniqueClusterCount(assignments) > this.options.targetClusters
    ) {
      const similarities = aggregateClusterSimilarities(snapshot, assignments)
      if (similarities.size === 0) {
        break
      }
      const [bestKey, bestWeight] =
        [...similarities.entries()].reduce<[string, number]>(
          (best, entry) => (entry[1] > best[1] ? entry : best),
          ['', Number.NEGATIVE_INFINITY],
        )

      if (bestWeight < this.options.minSimilarity || !bestKey) {
        break
      }

      const [clusterA, clusterB] = bestKey.split('|')
      this.mergeClusters(assignments, clusterA, clusterB)

      levels.push({
        level,
        assignments: cloneAssignments(assignments),
        merged: [{ from: clusterB, into: clusterA, weight: bestWeight }],
      })

      level += 1
    }

    return {
      levels,
      finalAssignments: assignments,
    }
  }

  private bootstrap(snapshot: GraphSnapshot): Map<string, string> {
    const assignments = new Map<string, string>()
    snapshot.nodes.forEach((node) => {
      assignments.set(node.id, node.id)
    })
    return assignments
  }

  private mergeClusters(assignments: Map<string, string>, target: string, source: string): void {
    assignments.forEach((clusterId, nodeId) => {
      if (clusterId === source) {
        assignments.set(nodeId, target)
      }
    })
  }
}

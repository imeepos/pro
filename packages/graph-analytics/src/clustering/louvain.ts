import { GraphSnapshot } from '../types.js'

export interface LouvainOptions {
  maxPasses?: number
  resolution?: number
  minGain?: number
}

export interface LouvainResult {
  assignments: Map<string, string>
  communities: Map<string, Set<string>>
  modularity: number
  iterations: number
}

type AdjacencyMap = Map<string, Map<string, number>>

interface WeightedGraph {
  adjacency: AdjacencyMap
  undirectedWeights: Map<string, number>
  nodeStrength: Map<string, number>
  totalWeight: number
}

const DEFAULT_OPTIONS: Required<LouvainOptions> = {
  maxPasses: 12,
  resolution: 1,
  minGain: 1e-6,
}

const sortedKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

export class LouvainCommunityDetector {
  private readonly options: Required<LouvainOptions>

  constructor(options: LouvainOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  run(snapshot: GraphSnapshot): LouvainResult {
    const graph = this.buildGraph(snapshot)
    const assignments = this.initializeAssignments(graph.adjacency)
    const communityWeights = new Map<string, number>()
    assignments.forEach((community, node) => {
      const weight = graph.nodeStrength.get(node) ?? 0
      communityWeights.set(community, (communityWeights.get(community) ?? 0) + weight)
    })

    let iterations = 0
    for (; iterations < this.options.maxPasses; iterations += 1) {
      let moved = false
      for (const node of this.shuffle([...graph.adjacency.keys()], iterations)) {
        const currentCommunity = assignments.get(node)!
        const nodeStrength = graph.nodeStrength.get(node) ?? 0
        const neighborCommunities = this.collectNeighborCommunities(node, assignments, graph.adjacency)

        communityWeights.set(currentCommunity, (communityWeights.get(currentCommunity) ?? 0) - nodeStrength)

        let bestCommunity = currentCommunity
        let bestGain = 0

        neighborCommunities.forEach((weightToCommunity, candidateCommunity) => {
          const gain = this.modularityGain({
            nodeStrength,
            communityStrength: communityWeights.get(candidateCommunity) ?? 0,
            weightToCommunity,
            totalWeight: graph.totalWeight,
          })

          if (gain > bestGain + this.options.minGain) {
            bestGain = gain
            bestCommunity = candidateCommunity
          }
        })

        communityWeights.set(bestCommunity, (communityWeights.get(bestCommunity) ?? 0) + nodeStrength)

        if (bestCommunity !== currentCommunity) {
          assignments.set(node, bestCommunity)
          moved = true
        }
      }

      if (!moved) {
        break
      }
    }

    const modularity = this.computeModularity(assignments, graph)
    const communities = this.buildCommunitySets(assignments)

    return {
      assignments,
      communities,
      modularity,
      iterations,
    }
  }

  private buildGraph(snapshot: GraphSnapshot): WeightedGraph {
    const adjacency: AdjacencyMap = new Map()
    const undirectedWeights = new Map<string, number>()

    snapshot.nodes.forEach((node) => {
      adjacency.set(node.id, new Map())
    })

    snapshot.edges.forEach((edge) => {
      const from = adjacency.get(edge.source)
      const to = adjacency.get(edge.target)

      if (!from || !to) {
        return
      }

      from.set(edge.target, (from.get(edge.target) ?? 0) + edge.weight)
      to.set(edge.source, (to.get(edge.source) ?? 0) + edge.weight)

      const key = sortedKey(edge.source, edge.target)
      undirectedWeights.set(key, (undirectedWeights.get(key) ?? 0) + edge.weight)
    })

    const nodeStrength = new Map<string, number>()
    adjacency.forEach((neighbors, node) => {
      const strength = [...neighbors.values()].reduce((sum, weight) => sum + weight, 0)
      nodeStrength.set(node, strength)
    })

    const totalWeight = [...undirectedWeights.values()].reduce((sum, weight) => sum + weight, 0)

    return {
      adjacency,
      undirectedWeights,
      nodeStrength,
      totalWeight,
    }
  }

  private initializeAssignments(adjacency: AdjacencyMap): Map<string, string> {
    const assignments = new Map<string, string>()
    adjacency.forEach((_, node) => {
      assignments.set(node, node)
    })
    return assignments
  }

  private collectNeighborCommunities(
    node: string,
    assignments: Map<string, string>,
    adjacency: AdjacencyMap,
  ): Map<string, number> {
    const communities = new Map<string, number>()
    const neighbors = adjacency.get(node)
    if (!neighbors) {
      return communities
    }

    neighbors.forEach((weight, neighbor) => {
      const community = assignments.get(neighbor)
      if (!community) {
        return
      }
      communities.set(community, (communities.get(community) ?? 0) + weight)
    })

    return communities
  }

  private modularityGain({
    nodeStrength,
    communityStrength,
    weightToCommunity,
    totalWeight,
  }: {
    nodeStrength: number
    communityStrength: number
    weightToCommunity: number
    totalWeight: number
  }): number {
    if (totalWeight === 0) {
      return 0
    }
    const twoM = 2 * totalWeight
    const expected = (nodeStrength * communityStrength) / twoM
    return (weightToCommunity - this.options.resolution * expected) / twoM
  }

  private computeModularity(assignments: Map<string, string>, graph: WeightedGraph): number {
    if (graph.totalWeight === 0) {
      return 0
    }
    const twoM = 2 * graph.totalWeight
    let modularity = 0

    graph.undirectedWeights.forEach((weight, key) => {
      const [a, b] = key.split('|')
      const communityA = assignments.get(a)
      const communityB = assignments.get(b)
      const strengthA = graph.nodeStrength.get(a) ?? 0
      const strengthB = graph.nodeStrength.get(b) ?? 0
      if (communityA && communityB && communityA === communityB) {
        modularity += weight - (strengthA * strengthB) / twoM
      }
    })

    return modularity / twoM
  }

  private buildCommunitySets(assignments: Map<string, string>): Map<string, Set<string>> {
    const communities = new Map<string, Set<string>>()
    assignments.forEach((communityId, nodeId) => {
      if (!communities.has(communityId)) {
        communities.set(communityId, new Set())
      }
      communities.get(communityId)!.add(nodeId)
    })
    return communities
  }

  private shuffle<T>(items: T[], seed: number): T[] {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = (Math.abs(Math.sin(seed + i)) * (i + 1)) | 0
      const swapIndex = j % (i + 1)
      ;[result[i], result[swapIndex]] = [result[swapIndex], result[i]]
    }
    return result
  }
}

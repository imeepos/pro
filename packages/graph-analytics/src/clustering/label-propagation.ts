import { GraphSnapshot } from '../types.js'

export interface LabelPropagationOptions {
  maxIterations?: number
  tolerance?: number
}

export interface LabelPropagationResult {
  labels: Map<string, string>
  iterations: number
  stabilized: boolean
}

type Adjacency = Map<string, Map<string, number>>

const DEFAULT_OPTIONS: Required<LabelPropagationOptions> = {
  maxIterations: 25,
  tolerance: 1e-6,
}

const buildAdjacency = (snapshot: GraphSnapshot): Adjacency => {
  const adjacency: Adjacency = new Map()

  snapshot.nodes.forEach((node) => {
    adjacency.set(node.id, new Map())
  })

  snapshot.edges.forEach((edge) => {
    const forward = adjacency.get(edge.source)
    const backward = adjacency.get(edge.target)
    if (!forward || !backward) {
      return
    }
    forward.set(edge.target, (forward.get(edge.target) ?? 0) + edge.weight)
    backward.set(edge.source, (backward.get(edge.source) ?? 0) + edge.weight)
  })

  return adjacency
}

const shuffled = <T>(values: T[], seed: number): T[] => {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = (Math.abs(Math.sin(seed + i)) * (i + 1)) | 0
    const swapIndex = j % (i + 1)
    ;[result[i], result[swapIndex]] = [result[swapIndex], result[i]]
  }
  return result
}

export class LabelPropagationClusterer {
  private readonly options: Required<LabelPropagationOptions>

  constructor(options: LabelPropagationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  run(snapshot: GraphSnapshot): LabelPropagationResult {
    const adjacency = buildAdjacency(snapshot)
    const labels = new Map<string, string>()
    adjacency.forEach((_, node) => {
      labels.set(node, node)
    })

    let iterations = 0
    let stabilized = false

    for (; iterations < this.options.maxIterations; iterations += 1) {
      let changes = 0
      for (const node of shuffled([...adjacency.keys()], iterations)) {
        const neighbors = adjacency.get(node)
        if (!neighbors || neighbors.size === 0) {
          continue
        }

        const scores = new Map<string, number>()
        neighbors.forEach((weight, neighbor) => {
          const label = labels.get(neighbor)
          if (!label) {
            return
          }
          scores.set(label, (scores.get(label) ?? 0) + weight)
        })

        if (scores.size === 0) {
          continue
        }

        const currentLabel = labels.get(node)!
        let bestLabel = currentLabel
        let bestScore = scores.get(currentLabel) ?? 0

        scores.forEach((score, label) => {
          if (score > bestScore + this.options.tolerance) {
            bestScore = score
            bestLabel = label
          } else if (Math.abs(score - bestScore) <= this.options.tolerance && label < bestLabel) {
            bestLabel = label
          }
        })

        if (bestLabel !== currentLabel) {
          labels.set(node, bestLabel)
          changes += 1
        }
      }

      if (changes === 0) {
        stabilized = true
        break
      }
    }

    return {
      labels,
      iterations,
      stabilized,
    }
  }
}

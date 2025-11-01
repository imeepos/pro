import { GraphAssemblyInput, GraphAssembler } from '../graph-builder/graph-assembler.js'
import { GraphSnapshot } from '../types.js'
import {
  LouvainCommunityDetector,
  LouvainResult,
} from '../clustering/louvain.js'
import {
  LabelPropagationClusterer,
  LabelPropagationResult,
} from '../clustering/label-propagation.js'
import {
  HierarchicalClusterer,
  HierarchicalResult,
} from '../clustering/hierarchical.js'
import { CentralityAnalyzer, CentralityReport } from '../analytics/centrality.js'
import { GraphAnomaly, GraphAnomalyDetector } from '../analytics/anomaly-detector.js'
import { CommunityTrendSummary, TrendPredictor } from '../analytics/trend-predictor.js'
import { GraphSnapshotCache } from '../storage/redis-cache.js'

export interface GraphClusteringPipelineOptions {
  cacheKey?: string
  evaluationTime?: Date
  persistSnapshot?: boolean
}

export interface GraphClusteringOutcome {
  snapshot: GraphSnapshot
  louvain: LouvainResult
  labelPropagation: LabelPropagationResult
  hierarchy: HierarchicalResult
  centrality: CentralityReport
  anomalies: GraphAnomaly[]
  trends: CommunityTrendSummary[]
}

export interface GraphClusteringDependencies {
  assembler?: GraphAssembler
  louvain?: LouvainCommunityDetector
  labelPropagation?: LabelPropagationClusterer
  hierarchy?: HierarchicalClusterer
  centrality?: CentralityAnalyzer
  anomalyDetector?: GraphAnomalyDetector
  trendPredictor?: TrendPredictor
  cache?: GraphSnapshotCache
}

export class GraphClusteringService {
  private readonly assembler: GraphAssembler
  private readonly louvain: LouvainCommunityDetector
  private readonly labelPropagation: LabelPropagationClusterer
  private readonly hierarchy: HierarchicalClusterer
  private readonly centrality: CentralityAnalyzer
  private readonly anomalyDetector: GraphAnomalyDetector
  private readonly trendPredictor: TrendPredictor
  private readonly cache?: GraphSnapshotCache

  constructor(dependencies: GraphClusteringDependencies = {}) {
    this.assembler = dependencies.assembler ?? new GraphAssembler()
    this.louvain = dependencies.louvain ?? new LouvainCommunityDetector()
    this.labelPropagation =
      dependencies.labelPropagation ?? new LabelPropagationClusterer()
    this.hierarchy = dependencies.hierarchy ?? new HierarchicalClusterer()
    this.centrality = dependencies.centrality ?? new CentralityAnalyzer()
    this.anomalyDetector =
      dependencies.anomalyDetector ?? new GraphAnomalyDetector()
    this.trendPredictor = dependencies.trendPredictor ?? new TrendPredictor()
    this.cache = dependencies.cache
  }

  async run(
    input: GraphAssemblyInput,
    options: GraphClusteringPipelineOptions = {},
  ): Promise<GraphClusteringOutcome> {
    const snapshot = this.assembler.assemble({
      ...input,
      evaluationTime: options.evaluationTime ?? input.evaluationTime ?? new Date(),
    })

    if (options.persistSnapshot && options.cacheKey && this.cache) {
      await this.cache.store(options.cacheKey, snapshot)
    }

    const louvainResult = this.louvain.run(snapshot)
    const labelPropagationResult = this.labelPropagation.run(snapshot)
    const hierarchyResult = this.hierarchy.run(snapshot, louvainResult.assignments)
    const centralityReport = this.centrality.analyze(snapshot)
    const anomalies = this.anomalyDetector.detect(centralityReport)
    const trends = this.trendPredictor.evaluateCommunities(
      snapshot,
      louvainResult.assignments,
      snapshot.generatedAt,
    )

    return {
      snapshot,
      louvain: louvainResult,
      labelPropagation: labelPropagationResult,
      hierarchy: hierarchyResult,
      centrality: centralityReport,
      anomalies,
      trends,
    }
  }
}

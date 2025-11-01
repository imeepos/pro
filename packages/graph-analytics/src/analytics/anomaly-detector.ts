import { CentralityReport, CentralityVector } from './centrality.js'

export interface AnomalyDetectorOptions {
  zScoreThreshold?: number
  minimumPageRank?: number
}

export interface GraphAnomaly {
  nodeId: string
  metric: keyof Pick<CentralityVector, 'outStrength' | 'inStrength' | 'pageRank'>
  value: number
  zScore: number
}

const DEFAULT_OPTIONS: Required<AnomalyDetectorOptions> = {
  zScoreThreshold: 2.5,
  minimumPageRank: 0.0001,
}

const mean = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

const standardDeviation = (values: number[], avg: number): number => {
  if (values.length === 0) {
    return 0
  }
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / Math.max(values.length - 1, 1)
  return Math.sqrt(variance)
}

const computeStats = (report: CentralityReport, selector: (vector: CentralityVector) => number) => {
  const values = [...report.metrics.values()].map(selector)
  const avg = mean(values)
  const deviation = standardDeviation(values, avg)
  return { avg, deviation }
}

export class GraphAnomalyDetector {
  private readonly options: Required<AnomalyDetectorOptions>

  constructor(options: AnomalyDetectorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  detect(report: CentralityReport): GraphAnomaly[] {
    const pageRankStats = computeStats(report, (vector) => vector.pageRank)
    const outStrengthStats = computeStats(report, (vector) => vector.outStrength)
    const inStrengthStats = computeStats(report, (vector) => vector.inStrength)

    const anomalies: GraphAnomaly[] = []

    report.metrics.forEach((vector, nodeId) => {
      this.evaluateMetric(
        nodeId,
        'pageRank',
        vector.pageRank,
        pageRankStats.avg,
        pageRankStats.deviation,
        anomalies,
      )
      this.evaluateMetric(
        nodeId,
        'outStrength',
        vector.outStrength,
        outStrengthStats.avg,
        outStrengthStats.deviation,
        anomalies,
      )
      this.evaluateMetric(
        nodeId,
        'inStrength',
        vector.inStrength,
        inStrengthStats.avg,
        inStrengthStats.deviation,
        anomalies,
      )
    })

    return anomalies.sort((a, b) => b.zScore - a.zScore)
  }

  private evaluateMetric(
    nodeId: string,
    metric: GraphAnomaly['metric'],
    value: number,
    avg: number,
    deviation: number,
    anomalies: GraphAnomaly[],
  ): void {
    if (deviation === 0) {
      return
    }

    const zScore = (value - avg) / deviation
    if (Math.abs(zScore) >= this.options.zScoreThreshold) {
      if (metric === 'pageRank' && value < this.options.minimumPageRank) {
        return
      }
      anomalies.push({ nodeId, metric, value, zScore })
    }
  }
}

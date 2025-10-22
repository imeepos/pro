export interface SentimentScore {
  readonly label: 'positive' | 'neutral' | 'negative';
  readonly confidence: number;
}

export interface TrendPoint {
  readonly observedAt: string;
  readonly positive: number;
  readonly neutral: number;
  readonly negative: number;
}

export interface KeywordInsight {
  readonly keyword: string;
  readonly weight: number;
}

export interface TimelineMoment {
  readonly timestamp: string;
  readonly title: string;
  readonly description: string;
  readonly impact?: 'low' | 'medium' | 'high';
}

export interface MilestoneInsight {
  readonly occurredAt: string;
  readonly headline: string;
  readonly summary: string;
}

export interface AnalysisReportSection {
  readonly title: string;
  readonly markdown: string;
}

export interface SentimentAnalysisBundle {
  readonly summary: string;
  readonly score: SentimentScore;
  readonly trend: readonly TrendPoint[];
  readonly keywords: readonly KeywordInsight[];
  readonly timeline: readonly TimelineMoment[];
  readonly milestones: readonly MilestoneInsight[];
  readonly report: readonly AnalysisReportSection[];
}

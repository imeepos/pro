export interface SentimentAnalysisResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  keywords: string[];
}

export interface NLPAnalysisResult {
  keywords: string[];
  topics: string[];
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}

export interface LLMAnalysisResult {
  status: 'completed' | 'not_implemented' | 'error';
  summary?: string;
  insights?: string[];
  errorMessage?: string;
}

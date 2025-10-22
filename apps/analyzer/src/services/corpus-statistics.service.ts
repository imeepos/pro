import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';

@Injectable()
export class CorpusStatisticsService {
  private readonly documentFrequency = new Map<string, number>();
  private documentCount = 0;
  private readonly maxTrackedTerms = 50000;

  constructor(private readonly logger: PinoLogger) {}

  documentTotal(): number {
    return this.documentCount;
  }

  idf(term: string): number {
    if (!term) {
      return 0;
    }

    if (this.documentCount === 0) {
      return 1;
    }

    const lowerCaseTerm = term.toLowerCase();
    const documentFrequency = this.documentFrequency.get(lowerCaseTerm) ?? 0.5;
    const weight = Math.log((1 + this.documentCount) / (1 + documentFrequency)) + 1;

    return Math.max(weight, 0);
  }

  recordDocument(tokens: Iterable<string>): void {
    const uniqueTerms = new Set<string>();
    for (const token of tokens) {
      const normalized = token.trim().toLowerCase();
      if (normalized.length === 0) {
        continue;
      }
      uniqueTerms.add(normalized);
    }

    if (uniqueTerms.size === 0) {
      return;
    }

    this.documentCount += 1;

    uniqueTerms.forEach((term) => {
      this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
    });

    if (this.documentFrequency.size > this.maxTrackedTerms) {
      this.pruneLowFrequencyTerms();
    }
  }

  private pruneLowFrequencyTerms(): void {
    const removable = Array.from(this.documentFrequency.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.ceil(this.documentFrequency.size * 0.1));

    removable.forEach(([term]) => this.documentFrequency.delete(term));
    this.logger.debug(
      {
        removedTerms: removable.length,
        remainingTerms: this.documentFrequency.size,
      },
      '清理低频词，保持语料统计轻盈',
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AnalysisReportSection,
  KeywordInsight,
  MilestoneInsight,
  SentimentAnalysisBundle,
  TrendPoint,
  TimelineMoment
} from '../models/analysis-result.model';
import { AnalyzerContext } from '../types/sentiment-analyzer.types';

@Injectable({
  providedIn: 'root'
})
export class AnalysisDataService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/sentiment`;
  private readonly bundleSubject = new BehaviorSubject<SentimentAnalysisBundle | null>(null);

  readonly bundle$: Observable<SentimentAnalysisBundle | null> = this.bundleSubject.asObservable();
  readonly trend$: Observable<readonly TrendPoint[] | null> = this.bundle$.pipe(
    map((bundle) => bundle?.trend ?? null)
  );
  readonly keywords$: Observable<readonly KeywordInsight[] | null> = this.bundle$.pipe(
    map((bundle) => bundle?.keywords ?? null)
  );
  readonly timeline$: Observable<readonly TimelineMoment[] | null> = this.bundle$.pipe(
    map((bundle) => bundle?.timeline ?? null)
  );
  readonly milestones$: Observable<readonly MilestoneInsight[] | null> = this.bundle$.pipe(
    map((bundle) => bundle?.milestones ?? null)
  );
  readonly reportSections$: Observable<readonly AnalysisReportSection[] | null> = this.bundle$.pipe(
    map((bundle) => bundle?.report ?? null)
  );

  async refreshBundle(context: AnalyzerContext): Promise<void> {
    const payload = await firstValueFrom(
      this.http.post<SentimentAnalysisBundle>(`${this.endpoint}/analyze`, context)
    );
    this.bundleSubject.next(this.normalizeBundle(payload));
  }

  async generateReport(context: AnalyzerContext): Promise<Blob> {
    const query = new URLSearchParams();
    if (context.eventId) {
      query.set('eventId', context.eventId);
    }
    if (context.topic) {
      query.set('topic', context.topic);
    }
    query.set('perspective', context.perspective);

    return firstValueFrom(
      this.http.get(`${this.endpoint}/report?${query.toString()}`, {
        responseType: 'blob'
      })
    );
  }

  reset(): void {
    this.bundleSubject.next(null);
  }

  private normalizeBundle(bundle: SentimentAnalysisBundle): SentimentAnalysisBundle {
    return {
      ...bundle,
      trend: [...bundle.trend].sort((a, b) => a.observedAt.localeCompare(b.observedAt)),
      timeline: [...bundle.timeline].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      milestones: [...bundle.milestones].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    };
  }
}

import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { AnalysisDataService } from '../../services/analysis-data.service';
import { AnalyzerContext } from '../../types/sentiment-analyzer.types';
import { SentimentTrendComponent } from '../visualization-components/sentiment-trend/sentiment-trend.component';
import { KeywordCloudComponent } from '../visualization-components/keyword-cloud/keyword-cloud.component';
import { TimelineViewComponent } from '../visualization-components/timeline-view/timeline-view.component';
import { MilestoneCardsComponent } from '../visualization-components/milestone-cards/milestone-cards.component';

@Component({
  selector: 'sentiment-analysis-panel',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzSpinModule,
    SentimentTrendComponent,
    KeywordCloudComponent,
    TimelineViewComponent,
    MilestoneCardsComponent
  ],
  templateUrl: './analysis-panel.component.html',
  styleUrls: ['./analysis-panel.component.scss']
})
export class AnalysisPanelComponent implements OnChanges, OnDestroy {
  private readonly analysisData = inject(AnalysisDataService);

  @Input({ required: true }) context!: AnalyzerContext;

  readonly bundle$ = this.analysisData.bundle$;
  readonly trend$ = this.analysisData.trend$;
  readonly keywords$ = this.analysisData.keywords$;
  readonly timeline$ = this.analysisData.timeline$;
  readonly milestones$ = this.analysisData.milestones$;
  readonly reportSections$ = this.analysisData.reportSections$;

  readonly loading = signal(false);
  readonly generatingReport = signal(false);

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['context'] && this.context) {
      await this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.analysisData.reset();
  }

  async refresh(): Promise<void> {
    if (!this.context) {
      return;
    }

    const hasScope = Boolean(this.context.eventId || this.context.topic);
    if (!hasScope) {
      this.analysisData.reset();
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    try {
      await this.analysisData.refreshBundle(this.context);
    } finally {
      this.loading.set(false);
    }
  }

  async exportReport(): Promise<void> {
    if (!this.context || this.generatingReport()) {
      return;
    }

    this.generatingReport.set(true);
    try {
      const blob = await this.analysisData.generateReport(this.context);
      this.triggerDownload(blob);
    } finally {
      this.generatingReport.set(false);
    }
  }

  private triggerDownload(blob: Blob): void {
    if (typeof window === 'undefined') {
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.createFileName();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private createFileName(): string {
    const topic = this.context.topic ?? this.context.eventId ?? 'sentiment';
    return `${topic}-analysis-report.pdf`;
  }
}

import { Component, Input, OnInit, OnDestroy, Optional, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subject, takeUntil } from 'rxjs';
import { IScreenComponent } from '../base/screen-component.interface';
import { EventStatus, EventQueryParams, SkerSDK } from '@pro/sdk';

export interface HotEventStaticEntry {
  id: string;
  name: string;
  summary?: string;
  occurTime?: string;
  location?: string;
  status?: 'draft' | 'published' | 'archived';
  heatScore?: number;
}

export interface HotEventsRankingConfig {
  mode?: 'edit' | 'display';
  title?: string;
  maxItems?: number;
  refreshInterval?: number;
  highlightTopN?: number;
  showSummary?: boolean;
  showTrend?: boolean;
  showLocation?: boolean;
  allowManualRefresh?: boolean;
  eventStatus?: 'all' | 'published';
  industryTypeId?: string;
  eventTypeId?: string;
  province?: string;
  staticEntries?: HotEventStaticEntry[];
}

type TrendState = 'up' | 'down' | 'steady';

interface HotEventSource {
  id: string;
  name: string;
  summary?: string;
  occurTime?: string | null;
  locationLabel?: string | null;
  status?: EventStatus;
  baseHeat?: number;
}

interface RankingEntry {
  id: string;
  ranking: number;
  name: string;
  summary?: string;
  occurTime?: string | null;
  locationLabel?: string | null;
  heatScore: number;
  heatDelta: number;
  trend: TrendState;
}

interface SnapshotEntry {
  ranking: number;
  heatScore: number;
}

const EDIT_CONFIG: HotEventsRankingConfig = {
  mode: 'edit',
  title: '热门事件排行榜',
  maxItems: 8,
  refreshInterval: 60000,
  highlightTopN: 3,
  showSummary: true,
  showTrend: true,
  showLocation: true,
  allowManualRefresh: true,
  eventStatus: 'published'
};

const DISPLAY_CONFIG: HotEventsRankingConfig = {
  mode: 'display',
  title: '热门事件排行榜',
  maxItems: 6,
  refreshInterval: 0,
  highlightTopN: 3,
  showSummary: false,
  showTrend: true,
  showLocation: true,
  allowManualRefresh: false,
  eventStatus: 'published'
};

@Component({
  selector: 'pro-hot-events-ranking',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="hot-events-card h-full flex flex-col">
      <div class="card-header flex items-center justify-between" *ngIf="config.title || config.allowManualRefresh">
        <h3 class="card-title">{{ config.title }}</h3>
        <button
          *ngIf="config.allowManualRefresh"
          type="button"
          class="manual-refresh"
          [disabled]="isLoading"
          (click)="manualRefresh()"
          aria-label="手动刷新热门事件">
          <span class="icon">⟳</span>
          <span>刷新</span>
        </button>
      </div>

      <div *ngIf="errorMessage" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>{{ errorMessage }}</p>
        <button type="button" class="retry-button" (click)="retryLoad()">重试</button>
      </div>

      <div *ngIf="!errorMessage && emptyMessage" class="empty-state">
        <span class="empty-icon">🕊️</span>
        <p>{{ emptyMessage }}</p>
      </div>

      <div *ngIf="!errorMessage && !emptyMessage" class="ranking-wrapper flex-1">
        <ul class="ranking-list">
          <li
            *ngFor="let item of ranking"
            class="ranking-item"
            [class.top-rank]="item.ranking <= highlightThreshold">
            <div class="rank-badge">
              {{ item.ranking | number:'2.0-0' }}
            </div>

            <div class="event-content">
              <div class="event-name" [title]="item.name">{{ item.name }}</div>
              <div class="event-meta" *ngIf="config.showLocation || item.occurTime">
                <span *ngIf="config.showLocation && item.locationLabel" class="location" [title]="item.locationLabel">
                  {{ item.locationLabel }}
                </span>
                <span *ngIf="item.occurTime" class="occur-time">
                  {{ item.occurTime | date:'MM-dd HH:mm' }}
                </span>
              </div>
              <div class="event-summary" *ngIf="config.showSummary && item.summary" [title]="item.summary">
                {{ item.summary }}
              </div>
            </div>

            <div class="metrics">
              <span class="heat-score">{{ item.heatScore }}</span>
              <div *ngIf="config.showTrend" class="trend" [ngClass]="item.trend">
                <span class="trend-symbol" aria-hidden="true">
                  <ng-container [ngSwitch]="item.trend">
                    <span *ngSwitchCase="'up'">↑</span>
                    <span *ngSwitchCase="'down'">↓</span>
                    <span *ngSwitchDefault>→</span>
                  </ng-container>
                </span>
                <span class="trend-delta" [ngClass]="{'positive': item.heatDelta > 0, 'negative': item.heatDelta < 0}">
                  {{ formatDelta(item.heatDelta) }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div class="loading-hint" *ngIf="isLoading && !errorMessage && !emptyMessage">
        <span class="spinner"></span>
        <span>加载中...</span>
      </div>

      <div *ngIf="lastUpdated && !errorMessage" class="last-updated">
        <span>最后更新 · {{ lastUpdated | date:'yyyy-MM-dd HH:mm:ss' }}</span>
      </div>
    </div>
  `,
  styles: [`
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .hot-events-card {
      position: relative;
      padding: 20px;
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.78));
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.35);
      color: #e2e8f0;
      overflow: hidden;
    }

    .card-header {
      margin-bottom: 16px;
    }

    .card-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: #f8fafc;
    }

    .manual-refresh {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid rgba(96, 165, 250, 0.45);
      background: rgba(37, 99, 235, 0.35);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.25s ease;
    }

    .manual-refresh:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.45);
      border-color: rgba(96, 165, 250, 0.65);
      color: #e0f2fe;
    }

    .manual-refresh:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .manual-refresh .icon {
      font-size: 14px;
    }

    .ranking-wrapper {
      position: relative;
    }

    .ranking-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ranking-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(30, 41, 59, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.18);
      transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease;
    }

    .ranking-item:hover {
      transform: translateY(-2px);
      border-color: rgba(148, 163, 184, 0.4);
    }

    .ranking-item.top-rank {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.55), rgba(14, 165, 233, 0.45));
      border-color: rgba(96, 165, 250, 0.65);
      box-shadow: 0 16px 32px rgba(59, 130, 246, 0.35);
    }

    .rank-badge {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: rgba(226, 232, 240, 0.95);
      color: #0f172a;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ranking-item.top-rank .rank-badge {
      background: linear-gradient(135deg, #facc15, #f97316);
      color: #1f2937;
      box-shadow: 0 10px 24px rgba(249, 115, 22, 0.4);
    }

    .event-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      flex: 1;
    }

    .event-name {
      font-size: 16px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-meta {
      display: flex;
      gap: 8px;
      font-size: 12px;
      color: rgba(226, 232, 240, 0.75);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-summary {
      font-size: 12px;
      color: rgba(148, 163, 184, 0.85);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .metrics {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      min-width: 80px;
    }

    .heat-score {
      font-size: 22px;
      font-weight: 700;
      color: #facc15;
      text-shadow: 0 6px 12px rgba(250, 204, 21, 0.3);
    }

    .trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .trend.up {
      color: #34d399;
    }

    .trend.down {
      color: #f87171;
    }

    .trend.steady {
      color: rgba(148, 163, 184, 0.85);
    }

    .trend-symbol {
      font-size: 14px;
    }

    .trend-delta {
      min-width: 34px;
      text-align: right;
    }

    .trend-delta.positive {
      color: #34d399;
    }

    .trend-delta.negative {
      color: #f87171;
    }

    .error-state,
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 28px;
      text-align: center;
      border-radius: 16px;
      background: rgba(30, 41, 59, 0.48);
      border: 1px dashed rgba(148, 163, 184, 0.35);
      color: rgba(226, 232, 240, 0.8);
    }

    .error-icon,
    .empty-icon {
      font-size: 28px;
    }

    .retry-button {
      padding: 6px 16px;
      border-radius: 9999px;
      border: 1px solid rgba(248, 113, 113, 0.45);
      background: rgba(220, 38, 38, 0.3);
      color: #fecaca;
      font-size: 12px;
      transition: all 0.25s ease;
    }

    .retry-button:hover {
      background: rgba(239, 68, 68, 0.35);
      border-color: rgba(248, 113, 113, 0.65);
    }

    .loading-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      font-size: 12px;
      color: rgba(148, 163, 184, 0.8);
    }

    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(148, 163, 184, 0.3);
      border-top-color: rgba(59, 130, 246, 0.8);
      border-radius: 9999px;
      display: inline-block;
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .last-updated {
      margin-top: 18px;
      font-size: 12px;
      color: rgba(148, 163, 184, 0.75);
      text-align: right;
    }
  `]
})
export class HotEventsRankingComponent implements IScreenComponent, OnInit, OnDestroy {
  @Input() config: HotEventsRankingConfig = DISPLAY_CONFIG;

  ranking: RankingEntry[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  emptyMessage: string | null = null;
  lastUpdated: Date | null = null;

  private destroy$ = new Subject<void>();
  private refreshReset$ = new Subject<void>();
  private snapshot = new Map<string, SnapshotEntry>();

  constructor(@Optional() private sdk: SkerSDK | null) {}

  get isEditMode(): boolean {
    return (this.config?.mode || 'display') === 'edit';
  }

  get highlightThreshold(): number {
    const value = this.config?.highlightTopN;
    return value && value > 0 ? value : 3;
  }

  ngOnInit(): void {
    this.config = this.mergeConfig(this.config);
    this.bootstrap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.refreshReset$.next();
    this.refreshReset$.complete();
  }

  onConfigChange(config: HotEventsRankingConfig): void {
    this.config = this.mergeConfig(config);
    this.bootstrap();
  }

  manualRefresh(): void {
    this.loadEvents(true);
  }

  retryLoad(): void {
    this.loadEvents(true);
  }

  formatDelta(value: number): string {
    if (value > 0) {
      return `+${value}`;
    }

    return String(value);
  }

  private bootstrap(): void {
    this.scheduleAutoRefresh();
    this.loadEvents(true);
  }

  private mergeConfig(config?: HotEventsRankingConfig): HotEventsRankingConfig {
    const mode = config?.mode || 'display';
    const preset = mode === 'edit' ? EDIT_CONFIG : DISPLAY_CONFIG;
    return { ...preset, ...config };
  }

  private scheduleAutoRefresh(): void {
    this.refreshReset$.next();

    const intervalMs = this.resolveRefreshInterval();
    if (intervalMs <= 0) {
      return;
    }

    interval(intervalMs)
      .pipe(takeUntil(this.destroy$), takeUntil(this.refreshReset$))
      .subscribe(() => this.loadEvents());
  }

  private resolveRefreshInterval(): number {
    const refresh = this.config?.refreshInterval;
    if (!refresh || refresh <= 0) {
      return 0;
    }

    return refresh;
  }

  private async loadEvents(force = false): Promise<void> {
    if (this.isLoading && !force) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.emptyMessage = null;

    try {
      const sources = await this.resolveSources();

      if (!sources.length) {
        if (this.isEditMode) {
          this.ranking = this.composeRanking(this.createMockSources());
          this.emptyMessage = '连接真实数据后将展示热门事件';
          this.lastUpdated = null;
        } else {
          this.ranking = [];
          this.emptyMessage = '尚无热门事件可供展示';
          this.lastUpdated = null;
        }
        return;
      }

      this.ranking = this.composeRanking(sources);
      this.lastUpdated = new Date();
    } catch (error) {
      console.error('[HotEventsRankingComponent] 数据加载失败', error);
      this.errorMessage = '热门事件数据加载失败';
      this.ranking = [];
      this.lastUpdated = null;
    } finally {
      this.isLoading = false;
    }
  }

  private async resolveSources(): Promise<HotEventSource[]> {
    if (this.config?.staticEntries && this.config.staticEntries.length) {
      return this.normalizeStaticEntries(this.config.staticEntries);
    }

    if (!this.sdk) {
      return [];
    }

    const events = await this.fetchEventsFromSdk();

    if (events.length) {
      return events;
    }

    return [];
  }

  private async fetchEventsFromSdk(): Promise<HotEventSource[]> {
    if (!this.sdk) {
      return [];
    }

    const desired = this.resolveDesiredCount();
    const params: EventQueryParams = {
      page: 1,
      pageSize: desired
    };

    if (this.config?.eventStatus === 'published') {
      params.status = EventStatus.PUBLISHED;
    }

    if (this.config?.industryTypeId) {
      params.industryTypeId = this.config.industryTypeId;
    }

    if (this.config?.eventTypeId) {
      params.eventTypeId = this.config.eventTypeId;
    }

    if (this.config?.province) {
      params.province = this.config.province;
    }

    const response = await this.sdk.event.getEvents(params);
    const dataset = response?.data || [];

    return dataset.map(event => ({
      id: event.id,
      name: event.eventName,
      summary: event.summary,
      occurTime: event.occurTime,
      locationLabel: this.composeLocationLabel(event.province, event.city, event.district),
      status: event.status
    }));
  }

  private resolveDesiredCount(): number {
    const requested = this.config?.maxItems;
    const base = requested && requested > 0 ? requested : 10;
    return Math.max(base * 2, base + 4);
  }

  private normalizeStaticEntries(entries: HotEventStaticEntry[]): HotEventSource[] {
    return entries
      .filter(entry => !!entry && !!entry.id && !!entry.name)
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        summary: entry.summary,
        occurTime: entry.occurTime || null,
        locationLabel: entry.location || null,
        status: this.interpretStatus(entry.status),
        baseHeat: typeof entry.heatScore === 'number' ? entry.heatScore : undefined
      }));
  }

  private interpretStatus(status?: HotEventStaticEntry['status']): EventStatus | undefined {
    if (!status) {
      return undefined;
    }

    switch (status) {
      case 'published':
        return EventStatus.PUBLISHED;
      case 'archived':
        return EventStatus.ARCHIVED;
      default:
        return EventStatus.DRAFT;
    }
  }

  private composeRanking(sources: HotEventSource[]): RankingEntry[] {
    const limit = this.config?.maxItems && this.config.maxItems > 0 ? this.config.maxItems : 10;

    const prepared = sources
      .map(item => ({
        id: item.id,
        name: item.name,
        summary: item.summary,
        occurTime: item.occurTime || null,
        locationLabel: item.locationLabel || null,
        heatScore: this.calculateHeatScore(item),
        status: item.status
      }))
      .sort((a, b) => {
        if (b.heatScore === a.heatScore) {
          const timeA = a.occurTime ? new Date(a.occurTime).getTime() : 0;
          const timeB = b.occurTime ? new Date(b.occurTime).getTime() : 0;
          return timeB - timeA;
        }

        return b.heatScore - a.heatScore;
      })
      .slice(0, limit);

    const ranking = prepared.map((item, index) => {
      const rankingPosition = index + 1;
      const previous = this.snapshot.get(item.id);
      const heatDelta = previous ? item.heatScore - previous.heatScore : 0;
      const trend = this.resolveTrend(previous, rankingPosition, heatDelta);

      return {
        id: item.id,
        ranking: rankingPosition,
        name: item.name,
        summary: item.summary,
        occurTime: item.occurTime,
        locationLabel: item.locationLabel,
        heatScore: item.heatScore,
        heatDelta,
        trend
      } satisfies RankingEntry;
    });

    this.snapshot = new Map(
      ranking.map(entry => [entry.id, { ranking: entry.ranking, heatScore: entry.heatScore }])
    );

    return ranking;
  }

  private resolveTrend(previous: SnapshotEntry | undefined, currentRank: number, heatDelta: number): TrendState {
    if (!previous) {
      return 'steady';
    }

    if (previous.ranking > currentRank) {
      return 'up';
    }

    if (previous.ranking < currentRank) {
      return 'down';
    }

    if (heatDelta > 0) {
      return 'up';
    }

    if (heatDelta < 0) {
      return 'down';
    }

    return 'steady';
  }

  private calculateHeatScore(source: HotEventSource): number {
    const now = Date.now();

    const occurTime = source.occurTime ? new Date(source.occurTime).getTime() : null;
    const hoursElapsed = occurTime ? Math.max(0, (now - occurTime) / 36e5) : null;
    const recencyScore = hoursElapsed !== null
      ? Math.max(0, 120 - hoursElapsed * 6)
      : 60;

    const summaryLength = source.summary ? source.summary.trim().length : 0;
    const narrativeScore = Math.min(24, summaryLength / 10);

    const locationScore = source.locationLabel ? Math.min(18, source.locationLabel.split(/[·,，]/).length * 6) : 6;

    const statusScore = this.statusWeight(source.status);

    const baseHeat = typeof source.baseHeat === 'number' ? source.baseHeat : 0;

    return Math.round(baseHeat + recencyScore + narrativeScore + locationScore + statusScore);
  }

  private statusWeight(status?: EventStatus): number {
    switch (status) {
      case EventStatus.PUBLISHED:
        return 28;
      case EventStatus.ARCHIVED:
        return 12;
      case EventStatus.DRAFT:
        return 8;
      default:
        return 10;
    }
  }

  private createMockSources(): HotEventSource[] {
    const now = new Date();

    return [
      {
        id: 'mock-1',
        name: '智慧园区能源调度平台上线',
        summary: '园区统一能源调度平台正式上线，首日完成 60% 能耗削峰。',
        occurTime: new Date(now.getTime() - 2 * 36e5).toISOString(),
        locationLabel: '苏州工业园区',
        status: EventStatus.PUBLISHED,
        baseHeat: 118
      },
      {
        id: 'mock-2',
        name: '重点项目集中动工仪式',
        summary: '全市 48 个重大项目同步启动，投资总额突破 320 亿元。',
        occurTime: new Date(now.getTime() - 8 * 36e5).toISOString(),
        locationLabel: '南京江北新区',
        status: EventStatus.PUBLISHED,
        baseHeat: 112
      },
      {
        id: 'mock-3',
        name: '新能源车企链主签约',
        summary: '新能源整车与核心零部件企业签署战略合作，建成跨区域产业协同联盟。',
        occurTime: new Date(now.getTime() - 18 * 36e5).toISOString(),
        locationLabel: '合肥高新区',
        status: EventStatus.PUBLISHED,
        baseHeat: 105
      },
      {
        id: 'mock-4',
        name: '城市算力中心投入试运行',
        summary: '城市级算力枢纽完成冷启动，可支撑双千亿级算力应用生态。',
        occurTime: new Date(now.getTime() - 30 * 36e5).toISOString(),
        locationLabel: '无锡经开区',
        status: EventStatus.DRAFT,
        baseHeat: 96
      },
      {
        id: 'mock-5',
        name: '东南沿海科技成果拍卖会',
        summary: '14 所高校同步发布 88 项专利成果，现场成交额破 9 亿元。',
        occurTime: new Date(now.getTime() - 44 * 36e5).toISOString(),
        locationLabel: '厦门自贸片区',
        status: EventStatus.PUBLISHED,
        baseHeat: 92
      }
    ];
  }

  private composeLocationLabel(province?: string | null, city?: string | null, district?: string | null): string | null {
    const parts = [province, city, district].filter(Boolean) as string[];
    if (!parts.length) {
      return null;
    }

    return parts.join(' · ');
  }
}

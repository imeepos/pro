import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  ViewChild,
  ViewEncapsulation,
  NgZone,
  Inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';
import { IScreenComponent } from '../base/screen-component.interface';
import { EventStatus, EventMapQueryParams, EventMapPoint } from '@pro/types';
import { EVENT_DATA_SOURCE, EventDataSource } from '../../data-providers/data-providers';
import { loadAmapLoader } from '../../utils/amap-loader';

type MapTheme = 'midnight' | 'ocean' | 'sunrise' | 'minimal';

interface ProvinceSummaryEntry {
  name: string;
  count: number;
  percentage: number;
}

export interface EventMapDistributionConfig {
  mode?: 'edit' | 'display';
  title?: string;
  mapTheme?: MapTheme;
  maxEvents?: number;
  refreshInterval?: number;
  autoFit?: boolean;
  enableCluster?: boolean;
  showLegend?: boolean;
  showSummary?: boolean;
  highlightLatest?: boolean;
  eventStatus?: 'all' | 'published';
  industryTypeId?: string;
  eventTypeId?: string;
  province?: string;
  apiKeyOverride?: string;
}

const EDIT_CONFIG: EventMapDistributionConfig = {
  mode: 'edit',
  title: '事件地图分布',
  mapTheme: 'minimal',
  maxEvents: 200,
  refreshInterval: 60000,
  autoFit: true,
  enableCluster: true,
  showLegend: true,
  showSummary: true,
  highlightLatest: true,
  eventStatus: 'published'
};

const DISPLAY_CONFIG: EventMapDistributionConfig = {
  mode: 'display',
  title: '事件地图分布',
  mapTheme: 'minimal',
  maxEvents: 120,
  refreshInterval: 0,
  autoFit: true,
  enableCluster: true,
  showLegend: true,
  showSummary: true,
  highlightLatest: true,
  eventStatus: 'published'
};

@Component({
  selector: 'pro-event-map-distribution',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="event-map-card h-full flex flex-col" [class.edit-mode]="isEditMode">
      <div class="map-stage relative flex-1">
        <div
          #mapCanvas
          class="map-canvas"
          [attr.aria-label]="config.title || '事件地图分布'"
        ></div>

        <div *ngIf="!mapReady && !mapError" class="map-overlay">
          <div class="loading-stack">
            <span class="spinner"></span>
            <p>地图加载中...</p>
          </div>
        </div>

        <div *ngIf="mapError" class="map-overlay">
          <div class="error-stack">
            <span class="error-icon">⚠️</span>
            <p>{{ mapError }}</p>
            <button type="button" (click)="retryInitialization()" class="retry-button">重新尝试</button>
          </div>
        </div>

        <div *ngIf="config.showLegend && mapReady && !mapError" class="map-legend">
          <div class="legend-item">
            <span class="legend-dot legend-dot-latest"></span>
            最新事件
          </div>
          <div class="legend-item">
            <span class="legend-dot legend-dot-regular"></span>
            发布事件
          </div>
          <div class="legend-item" *ngIf="config.enableCluster">
            <span class="legend-badge">12+</span>
            聚合气泡
          </div>
        </div>

        <div *ngIf="!hasPlottableEvents && mapReady && !isLoading && !dataError" class="empty-hint">
          <p>尚无包含经纬度的事件</p>
          <small>请在事件管理中为事件补充位置信息</small>
        </div>
      </div>

      <div *ngIf="config.showSummary && provinceSummary.length" class="map-summary grid">
        <div *ngFor="let item of provinceSummary" class="summary-item">
          <div class="summary-top flex items-center justify-between">
            <span class="summary-name">{{ item.name }}</span>
            <span class="summary-count">{{ item.count }}</span>
          </div>
          <div class="summary-bar mt-2">
            <span class="summary-bar-inner" [style.width.%]="item.percentage"></span>
          </div>
          <div class="summary-foot flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>覆盖占比</span>
            <span>{{ item.percentage }}%</span>
          </div>
        </div>
      </div>

      <div *ngIf="lastUpdated" class="card-footer text-xs text-slate-500 flex items-center justify-between">
        <span>最后更新 · {{ lastUpdated | date:'yyyy-MM-dd HH:mm:ss' }}</span>
        <button type="button" class="manual-refresh" (click)="manualRefresh()" [disabled]="isLoading">
          <span>手动刷新</span>
        </button>
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

    .event-map-card {
      position: relative;
      overflow: hidden;
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
    }

    .map-stage {
      min-height: 0;
      border-radius: 0;
      background: transparent;
      border: none;
      overflow: hidden;
    }

    .map-canvas {
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    .map-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #1f2937;
      gap: 12px;
      box-shadow: inset 0 -1px 0 rgba(148,163,184,0.15);
    }

    .loading-stack .spinner {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: 3px solid rgba(148,163,184,0.35);
      border-top-color: rgba(59,130,246,0.75);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .map-legend {
      position: absolute;
      top: 16px;
      right: 16px;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 0;
      border-radius: 0;
      background: transparent;
      color: #ffffff;
      backdrop-filter: none;
      border: none;
      box-shadow: none;
      font-size: 12px;
      text-shadow: 0 0 6px rgba(15,23,42,0.65);
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      box-shadow: none;
    }

    .legend-dot-latest {
      color: #f97316;
      background: #fb923c;
    }

    .legend-dot-regular {
      color: #38bdf8;
      background: #38bdf8;
    }

    .legend-badge {
      min-width: 28px;
      height: 22px;
      padding: 0 6px;
      border-radius: 999px;
      background: transparent;
      border: 1px solid currentColor;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #ffffff;
    }

    .empty-hint {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15,23,42,0.6);
      color: #f8fafc;
      gap: 6px;
      text-align: center;
    }

    .map-summary {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .summary-item {
      padding: 12px 0;
      border-radius: 0;
      background: transparent;
      border: none;
      backdrop-filter: none;
      color: #0f172a;
    }

    .summary-name {
      font-size: 14px;
      letter-spacing: 0.5px;
    }

    .summary-count {
      font-size: 18px;
      font-weight: 600;
      color: rgba(21,128,61,0.9);
    }

    .summary-bar {
      height: 6px;
      border-radius: 999px;
      background: rgba(148,163,184,0.35);
      overflow: hidden;
    }

    .summary-bar-inner {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(59,130,246,0.8), rgba(14,165,233,0.85));
      transition: width 0.4s ease;
    }

    .card-footer {
      border-top: none;
      padding-top: 0;
    }

    .manual-refresh {
      border: none;
      padding: 0;
      border-radius: 0;
      color: #2563eb;
      background: transparent;
      transition: all 0.3s ease;
    }

    .manual-refresh:hover:not(:disabled) {
      color: #1d4ed8;
      box-shadow: none;
    }

    .manual-refresh:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .error-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .error-icon {
      font-size: 32px;
    }

    .retry-button {
      margin-top: 8px;
      padding: 6px 18px;
      border-radius: 999px;
      border: 1px solid rgba(248,113,113,0.6);
      background: rgba(248,113,113,0.15);
      color: rgba(185,28,28,0.95);
      transition: all 0.3s ease;
    }

    .retry-button:hover {
      background: rgba(248,113,113,0.2);
    }

    @media (max-width: 1440px) {
      .map-canvas {
        min-height: 0;
      }

      .map-summary {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      }
    }
  `]
})
export class EventMapDistributionComponent implements IScreenComponent, OnInit, AfterViewInit, OnDestroy {
  @Input() config?: EventMapDistributionConfig;
  @ViewChild('mapCanvas', { static: true }) mapCanvasRef?: ElementRef<HTMLDivElement>;

  totalEvents = 0;
  provinceSummary: ProvinceSummaryEntry[] = [];
  lastUpdated: Date | null = null;
  mapReady = false;
  hasPlottableEvents = false;
  isLoading = false;
  dataError: string | null = null;
  mapError: string | null = null;

  private events: EventMapPoint[] = [];
  private destroy$ = new Subject<void>();
  private refreshReset$ = new Subject<void>();
  private mapInstance: any;
  private amapNamespace: any;
  private markerInstances: any[] = [];
  private clusterInstance: any;
  private resizeObserver?: ResizeObserver;

  private static amapKeyCache: { value: string; expiresAt: number } | null = null;
  private static amapLoaderPromise: Promise<any> | null = null;

  constructor(
    private ngZone: NgZone,
    @Optional() @Inject(EVENT_DATA_SOURCE) private dataSource: EventDataSource | null
  ) {}

  get isEditMode(): boolean {
    return (this.config?.mode || 'display') === 'edit';
  }

  ngOnInit(): void {
    this.config = this.mergeConfig(this.config);
  }

  ngAfterViewInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshReset$.next();
    this.refreshReset$.complete();

    if (this.resizeObserver && this.mapCanvasRef) {
      this.resizeObserver.unobserve(this.mapCanvasRef.nativeElement);
    }

    if (this.mapInstance) {
      this.mapInstance.destroy();
      this.mapInstance = null;
    }

    this.clearMarkers();
  }

  onConfigChange(config: EventMapDistributionConfig): void {
    this.config = this.mergeConfig(config);

    if (this.mapInstance) {
      this.mapInstance.setMapStyle(this.getMapStyle(this.config.mapTheme));
    }

    this.scheduleAutoRefresh();
    this.loadEvents();
  }

  manualRefresh(): void {
    this.loadEvents(true);
  }

  retryInitialization(): void {
    this.mapError = null;
    this.initializeComponent();
  }

  private async initializeComponent(): Promise<void> {
    if (!this.mapCanvasRef) {
      return;
    }

    if (!this.dataSource && !this.config?.apiKeyOverride) {
      this.mapError = '等待认证完成后方可加载地图';
      return;
    }

    try {
      await this.prepareMap();
      await this.loadEvents();
      this.scheduleAutoRefresh();
    } catch (error) {
      console.error('[EventMapDistributionComponent] 初始化失败', error);
      this.mapError = '地图加载失败，请稍后重试';
    }
  }

  private async prepareMap(): Promise<void> {
    if (this.mapInstance) {
      return;
    }

    this.mapReady = false;

    this.amapNamespace = await this.getAmapNamespace();

    if (!this.mapCanvasRef) {
      throw new Error('地图容器未准备就绪');
    }

    this.mapInstance = new this.amapNamespace.Map(this.mapCanvasRef.nativeElement, {
      viewMode: '3D',
      zoom: 4.5,
      pitch: 40,
      mapStyle: this.getMapStyle(this.config?.mapTheme),
      center: [104.195397, 35.86166],
      zooms: [3, 18],
      showLabel: true
    });

    this.mapReady = true;
    this.observeSize();
  }

  private async loadEvents(force = false): Promise<void> {
    if (!this.dataSource) {
      this.dataError = '事件服务不可用';
      return;
    }

    if (this.isLoading && !force) {
      return;
    }

    this.isLoading = true;
    this.dataError = null;

    try {
      const desiredEventCount =
        this.config?.maxEvents && this.config.maxEvents > 0 ? this.config.maxEvents : 200;
      const query: EventMapQueryParams = {};

      if (this.config?.eventStatus === 'published') {
        query.status = EventStatus.PUBLISHED;
      }

      if (this.config?.industryTypeId) {
        query.industryTypeId = this.config.industryTypeId;
      }

      if (this.config?.eventTypeId) {
        query.eventTypeId = this.config.eventTypeId;
      }

      if (this.config?.province) {
        query.province = this.config.province;
      }

      const response = await this.dataSource.fetchEventsForMap(query);
      const dataset = (response || []).filter(event => this.hasCoordinates(event));
      const items =
        desiredEventCount > 0 ? dataset.slice(0, desiredEventCount) : dataset;

      this.events = items;
      this.totalEvents = items.length;
      this.provinceSummary = this.buildProvinceSummary(items);
      const latest = this.findLatestEvent(items);
      this.lastUpdated = new Date();
      this.hasPlottableEvents = items.length > 0;

      if (this.mapInstance && this.mapReady) {
        this.renderMarkers(items, latest?.id);
      }
    } catch (error) {
      console.error('[EventMapDistributionComponent] 事件数据加载失败', error);
      this.dataError = '事件数据加载失败';
      this.events = [];
      this.totalEvents = 0;
      this.provinceSummary = [];
      this.hasPlottableEvents = false;
      this.clearMarkers();
    } finally {
      this.isLoading = false;
    }
  }

  private renderMarkers(events: EventMapPoint[], latestEventId?: string): void {
    if (!this.amapNamespace || !this.mapInstance) {
      return;
    }

    this.clearMarkers();

    const markers = events
      .filter(event => this.hasCoordinates(event))
      .map(event => ({
        event,
        position: [Number(event.longitude), Number(event.latitude)] as [number, number]
      }));

    if (markers.length === 0) {
      this.hasPlottableEvents = false;
      return;
    }

    this.hasPlottableEvents = true;

    if (this.config?.enableCluster && markers.length >= 15) {
      const clusterData = markers.map(item => ({
        lnglat: item.position,
        weight: 1,
        data: item.event
      }));

      this.clusterInstance = new this.amapNamespace.MarkerCluster(this.mapInstance, clusterData, {
        gridSize: 80,
        renderClusterMarker: (context: any) => this.renderClusterMarker(context),
        renderMarker: (context: any) => this.renderMarker(context, latestEventId)
      });
    } else {
      markers.forEach(item => {
        const marker = this.createEventMarker(item.event, item.position, item.event.id === latestEventId);
        this.markerInstances.push(marker);
      });
    }

    if (this.config?.autoFit) {
      this.autoFitView(markers.map(item => item.position));
    }
  }

  private renderClusterMarker(context: any): void {
    const count = context.count;
    const size = Math.min(64, 32 + count * 1.1);
    const div = document.createElement('div');
    div.style.cssText = `
      background: linear-gradient(135deg, rgba(56,189,248,0.95), rgba(59,130,246,0.9));
      color: #ecfeff;
      border: 2px solid rgba(14,165,233,0.85);
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      box-shadow: 0 8px 20px rgba(14,165,233,0.35);
    `;
    div.innerText = String(count);
    context.marker.setContent(div);
    context.marker.setAnchor('center');
  }

  private renderMarker(context: any, latestEventId?: string): void {
    const data: EventMapPoint = context.data[0].data;
    const marker = context.marker;
    marker.setIcon(this.createMarkerIcon(data.id === latestEventId));
    marker.setTitle(data.eventName);

    const infoWindow = new this.amapNamespace.InfoWindow({
      content: this.composeInfoContent(data),
      offset: new this.amapNamespace.Pixel(0, -30)
    });

    marker.on('click', () => {
      infoWindow.open(this.mapInstance, marker.getPosition());
    });
  }

  private createEventMarker(event: EventMapPoint, position: [number, number], highlight: boolean) {
    const marker = new this.amapNamespace.Marker({
      position,
      map: this.mapInstance,
      icon: this.createMarkerIcon(highlight),
      offset: new this.amapNamespace.Pixel(-16, -36),
      title: event.eventName
    });

    const infoWindow = new this.amapNamespace.InfoWindow({
      content: this.composeInfoContent(event),
      offset: new this.amapNamespace.Pixel(0, -30)
    });

    marker.on('click', () => {
      infoWindow.open(this.mapInstance, marker.getPosition());
    });

    return marker;
  }

  private createMarkerIcon(highlight: boolean): any {
    const color = highlight ? '#fb923c' : '#38bdf8';
    const glow = highlight ? 'rgba(251, 146, 60, 0.9)' : 'rgba(56, 189, 248, 0.9)';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 24 24" fill="${color}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="${glow}" flood-opacity="0.65"/>
          </filter>
        </defs>
        <path filter="url(#shadow)" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>
    `;

    return new this.amapNamespace.Icon({
      size: new this.amapNamespace.Size(46, 46),
      image: `data:image/svg+xml;base64,${btoa(svg)}`,
      imageSize: new this.amapNamespace.Size(46, 46)
    });
  }

  private composeInfoContent(event: EventMapPoint): string {
    const time = event.occurTime ? new Date(event.occurTime).toLocaleString() : '未知时间';
    const address = [event.province, event.city, event.district, event.street]
      .filter(Boolean)
      .join(' · ') || '位置待补全';
    const summary = event.summary ? `<p class="summary">${this.escapeHtml(event.summary)}</p>` : '';

    return `
      <div class="event-info-window">
        <h3>${this.escapeHtml(event.eventName)}</h3>
        <p class="meta">发生时间 · ${this.escapeHtml(time)}</p>
        <p class="meta">地点 · ${this.escapeHtml(address)}</p>
        ${summary}
      </div>
    `;
  }

  private clearMarkers(): void {
    this.markerInstances.forEach(marker => marker.setMap(null));
    this.markerInstances = [];

    if (this.clusterInstance) {
      this.clusterInstance.setMap(null);
      this.clusterInstance = null;
    }
  }

  private autoFitView(points: Array<[number, number]>): void {
    if (!points.length) {
      return;
    }

    if (points.length === 1) {
      this.mapInstance.setZoomAndCenter(10, points[0]);
      return;
    }

    const longitudes = points.map(point => point[0]);
    const latitudes = points.map(point => point[1]);

    const bounds = new this.amapNamespace.Bounds(
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)]
    );

    this.mapInstance.setBounds(bounds, false, [80, 60, 80, 140]);
  }

  private scheduleAutoRefresh(): void {
    this.refreshReset$.next();

    if (!this.config?.refreshInterval || this.config.refreshInterval <= 0) {
      return;
    }

    interval(this.config.refreshInterval)
      .pipe(takeUntil(this.refreshReset$), takeUntil(this.destroy$))
      .subscribe(() => this.loadEvents());
  }

  private buildProvinceSummary(events: EventMapPoint[]): ProvinceSummaryEntry[] {
    if (!events.length) {
      return [];
    }

    const regionCount = new Map<string, number>();
    events.forEach(event => {
      const key = event.province || event.city || '未分组区域';
      regionCount.set(key, (regionCount.get(key) || 0) + 1);
    });

    const sorted = Array.from(regionCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return sorted.map(item => ({
      name: item.name,
      count: item.count,
      percentage: Math.min(100, Math.round((item.count / events.length) * 100))
    }));
  }

  private findLatestEvent(events: EventMapPoint[]): EventMapPoint | undefined {
    if (!events.length) {
      return undefined;
    }

    return events.reduce((latest: EventMapPoint | undefined, current) => {
      if (!latest) {
        return current;
      }
      const latestTime = latest.occurTime ? new Date(latest.occurTime).getTime() : 0;
      const currentTime = current.occurTime ? new Date(current.occurTime).getTime() : 0;
      return currentTime > latestTime ? current : latest;
    }, undefined as EventMapPoint | undefined);
  }

  private hasCoordinates(event: EventMapPoint): boolean {
    return typeof event.longitude === 'number'
      && typeof event.latitude === 'number'
      && !Number.isNaN(event.longitude)
      && !Number.isNaN(event.latitude);
  }

  private escapeHtml(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  private mergeConfig(newConfig?: EventMapDistributionConfig): EventMapDistributionConfig {
    const incomingMode = newConfig?.mode || this.config?.mode || 'display';
    const base = incomingMode === 'edit' ? EDIT_CONFIG : DISPLAY_CONFIG;
    return {
      ...base,
      ...this.config,
      ...newConfig,
      mode: incomingMode
    };
  }

  private getMapStyle(theme: MapTheme = 'minimal'): string {
    switch (theme) {
      case 'ocean':
        return 'amap://styles/blue';
      case 'sunrise':
        return 'amap://styles/macaron';
      case 'minimal':
        return 'amap://styles/whitesmoke';
      default:
        return 'amap://styles/whitesmoke';
    }
  }

  private async getAmapNamespace(): Promise<any> {
    if (EventMapDistributionComponent.amapLoaderPromise) {
      return EventMapDistributionComponent.amapLoaderPromise;
    }

    const key = await this.resolveAmapKey();

    const loaderPromise = this.fetchAmapLoader().then(AMapLoader =>
      AMapLoader.load({
        key,
        version: '2.0',
        plugins: ['AMap.InfoWindow', 'AMap.MarkerCluster', 'AMap.Scale', 'AMap.ControlBar']
      })
    );

    EventMapDistributionComponent.amapLoaderPromise = loaderPromise.then(namespace => {
      return namespace;
    }).catch(error => {
      EventMapDistributionComponent.amapLoaderPromise = null;
      throw error;
    });

    return EventMapDistributionComponent.amapLoaderPromise;
  }

  private async resolveAmapKey(): Promise<string> {
    if (this.config?.apiKeyOverride) {
      return this.config.apiKeyOverride;
    }

    const cached = EventMapDistributionComponent.amapKeyCache;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (!this.dataSource) {
      throw new Error('无法获取地图密钥：事件数据源未注入');
    }

    const value = await this.dataSource.fetchAmapApiKey();
    if (!value || value.length < 8) {
      throw new Error('高德地图密钥不可用');
    }

    EventMapDistributionComponent.amapKeyCache = {
      value,
      expiresAt: Date.now() + 60 * 60 * 1000
    };

    return value;
  }

  private observeSize(): void {
    if (!this.mapCanvasRef || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.mapInstance) {
        this.mapInstance.resize();
      }
    });

    this.resizeObserver.observe(this.mapCanvasRef.nativeElement);
  }

  private async fetchAmapLoader(): Promise<any> {
    try {
      return await loadAmapLoader();
    } catch (error) {
      throw error instanceof Error ? error : new Error('高德地图加载器初始化失败');
    }
  }
}

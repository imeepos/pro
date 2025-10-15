import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subject, Subscription, takeUntil } from 'rxjs';
import { IScreenComponent } from '../base/screen-component.interface';

export interface WordCloudDatum {
  term: string;
  weight: number;
  category?: string;
  color?: string;
}

export interface WordCloudStatisticsConfig {
  mode?: 'edit' | 'display';
  title?: string;
  words?: WordCloudDatum[];
  maxWords?: number;
  minFontSize?: number;
  maxFontSize?: number;
  palette?: string[];
  background?: 'dark' | 'light' | 'transparent';
  rotate?: boolean;
  rotationAngles?: number[];
  refreshInterval?: number;
  highlightThreshold?: number;
  showMetaPanel?: boolean;
  randomizeOnRefresh?: boolean;
}

interface WordCloudRenderModel {
  term: string;
  weight: number;
  category?: string;
  color: string;
  fontSize: number;
  opacity: number;
  transform: string;
  emphasis: boolean;
}

const FALLBACK_WORDS: WordCloudDatum[] = [
  { term: '数据治理', weight: 96, category: 'strategy' },
  { term: '实时监控', weight: 88, category: 'operations' },
  { term: '智能分析', weight: 82, category: 'ai' },
  { term: '品牌声量', weight: 75, category: 'insight' },
  { term: '热点追踪', weight: 71, category: 'insight' },
  { term: '异常告警', weight: 65, category: 'operations' },
  { term: '用户画像', weight: 58, category: 'strategy' },
  { term: '风险研判', weight: 54, category: 'risk' },
  { term: '情绪脉络', weight: 49, category: 'ai' },
  { term: '多端协同', weight: 46, category: 'collaboration' },
  { term: '事件回溯', weight: 40, category: 'risk' },
  { term: '流量洞察', weight: 37, category: 'insight' }
];

const DEFAULT_CONFIG: Required<Omit<WordCloudStatisticsConfig, 'words'>> &
  Pick<WordCloudStatisticsConfig, 'words'> = {
  mode: 'display',
  title: '关键词词云',
  maxWords: 60,
  minFontSize: 18,
  maxFontSize: 54,
  palette: ['#2563eb', '#7c3aed', '#ea580c', '#059669', '#f59e0b', '#0ea5e9'],
  background: 'transparent',
  rotate: true,
  rotationAngles: [-25, -12, 0, 12, 25],
  refreshInterval: 45000,
  highlightThreshold: 72,
  showMetaPanel: true,
  randomizeOnRefresh: true,
  words: FALLBACK_WORDS
};

@Component({
  selector: 'pro-word-cloud-statistics',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="word-cloud-card"
      [class.word-cloud-card--edit]="isEditMode"
      [class.word-cloud-card--dark]="config.background === 'dark'"
      [class.word-cloud-card--light]="config.background === 'light'"
    >
      <header class="word-cloud-card__header" *ngIf="config.title || isEditMode">
        <div class="word-cloud-card__title">
          <span class="word-cloud-card__emoji">☁️</span>
          <h3>{{ config.title }}</h3>
        </div>
        <div class="word-cloud-card__meta" *ngIf="isEditMode && config.showMetaPanel">
          <span>词条 {{ renderedWords.length }}</span>
          <span *ngIf="dominantTerms.length">高亮 {{ dominantTerms.length }}</span>
          <button type="button" (click)="shuffleLayout()" class="word-cloud-card__action">
            重新排布
          </button>
        </div>
      </header>

      <div class="word-cloud-card__body" [class.word-cloud-card__body--empty]="!renderedWords.length">
        <div class="word-cloud-empty" *ngIf="!renderedWords.length">
          <span>当前暂无词云数据</span>
          <small>请配置词条或连接实时数据源</small>
        </div>

        <div
          class="word-cloud-canvas"
          *ngIf="renderedWords.length"
          [attr.aria-label]="config.title || '词云统计'"
        >
          <span
            *ngFor="let word of renderedWords; trackBy: trackByTerm"
            class="word-cloud-token"
            [class.word-cloud-token--dominant]="word.emphasis"
            [style.fontSize.px]="word.fontSize"
            [style.opacity]="word.opacity"
            [style.color]="word.color"
            [style.transform]="word.transform"
          >
            {{ word.term }}
          </span>
        </div>
      </div>

      <footer class="word-cloud-card__footer" *ngIf="isEditMode && config.showMetaPanel && renderedWords.length">
        <div class="word-cloud-legend" *ngIf="categoryPalette.size">
          <span class="word-cloud-legend__label">色彩映射</span>
          <ng-container *ngFor="let category of categoryPaletteKeys; trackBy: trackCategory">
            <span class="word-cloud-legend__chip">
              <span class="word-cloud-legend__dot" [style.backgroundColor]="categoryPalette.get(category)"></span>
              {{ category }}
            </span>
          </ng-container>
        </div>

        <div class="word-cloud-dominant" *ngIf="dominantTerms.length">
          <span class="word-cloud-dominant__label">焦点词</span>
          <span *ngFor="let item of dominantTerms; trackBy: trackByTerm" class="word-cloud-dominant__item">
            {{ item.term }} · {{ item.weight }}
          </span>
        </div>
      </footer>
    </section>
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

    .word-cloud-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px 24px;
      border-radius: 20px;
      background: linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78));
      backdrop-filter: blur(12px);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
      transition: transform 260ms ease, box-shadow 260ms ease;
    }

    .word-cloud-card--edit {
      box-shadow: 0 32px 68px rgba(30, 64, 175, 0.25);
      transform: translateY(-2px);
    }

    .word-cloud-card--dark {
      background: linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,58,138,0.84));
      color: rgba(226, 232, 240, 0.92);
    }

    .word-cloud-card--light {
      background: linear-gradient(145deg, rgba(248,250,252,0.96), rgba(226,232,240,0.88));
    }

    .word-cloud-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .word-cloud-card__title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .word-cloud-card__title h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .word-cloud-card__emoji {
      font-size: 20px;
      line-height: 1;
    }

    .word-cloud-card__meta {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 13px;
      opacity: 0.8;
    }

    .word-cloud-card__action {
      border: none;
      background: rgba(59, 130, 246, 0.14);
      color: rgba(37, 99, 235, 1);
      border-radius: 999px;
      padding: 6px 14px;
      cursor: pointer;
      font-size: 12px;
      transition: background 200ms ease, transform 200ms ease;
    }

    .word-cloud-card__action:hover {
      background: rgba(37, 99, 235, 0.24);
      transform: translateY(-1px);
    }

    .word-cloud-card__body {
      position: relative;
      flex: 1;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.78);
      padding: 12px;
      overflow: hidden;
    }

    .word-cloud-card--dark .word-cloud-card__body {
      background: rgba(15, 23, 42, 0.36);
    }

    .word-cloud-canvas {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-wrap: wrap;
      align-content: space-evenly;
      justify-content: center;
      gap: 12px 16px;
    }

    .word-cloud-token {
      display: inline-block;
      font-weight: 600;
      letter-spacing: 0.015em;
      transition: transform 280ms ease, opacity 260ms ease;
      will-change: transform;
    }

    .word-cloud-token--dominant {
      text-shadow: 0 12px 30px rgba(37, 99, 235, 0.35);
    }

    .word-cloud-token:hover {
      transform: scale(1.04);
    }

    .word-cloud-card__body--empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      color: rgba(100, 116, 139, 0.9);
    }

    .word-cloud-empty span {
      font-weight: 500;
    }

    .word-cloud-empty small {
      font-size: 12px;
      opacity: 0.7;
    }

    .word-cloud-card__footer {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 12px;
    }

    .word-cloud-legend {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      opacity: 0.85;
    }

    .word-cloud-legend__label {
      font-weight: 600;
      opacity: 0.9;
    }

    .word-cloud-legend__chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.18);
    }

    .word-cloud-card--dark .word-cloud-legend__chip {
      background: rgba(51, 65, 85, 0.42);
    }

    .word-cloud-legend__dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }

    .word-cloud-dominant {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .word-cloud-dominant__label {
      font-weight: 600;
      opacity: 0.9;
    }

    .word-cloud-dominant__item {
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.12);
      color: rgba(37, 99, 235, 0.92);
    }

    .word-cloud-card--dark .word-cloud-dominant__item {
      background: rgba(59, 130, 246, 0.24);
      color: rgba(191, 219, 254, 0.96);
    }
  `]
})
export class WordCloudStatisticsComponent implements IScreenComponent, OnInit, OnDestroy {
  @Input() config: WordCloudStatisticsConfig = { ...DEFAULT_CONFIG };

  renderedWords: WordCloudRenderModel[] = [];
  categoryPalette = new Map<string, string>();
  dominantTerms: WordCloudRenderModel[] = [];
  isEditMode = false;

  private readonly destroy$ = new Subject<void>();
  private autoRefresh?: Subscription;
  private baseWords: WordCloudDatum[] = [...FALLBACK_WORDS];

  constructor(@Optional() private readonly cdr?: ChangeDetectorRef | null) {}

  ngOnInit(): void {
    this.mergeConfig(this.config);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAutoRefresh();
  }

  onConfigChange(next: WordCloudStatisticsConfig): void {
    this.mergeConfig(next);
  }

  setWords(entries: WordCloudDatum[]): void {
    if (!Array.isArray(entries) || !entries.length) {
      return;
    }

    this.baseWords = entries.map(item => ({ ...item }));
    this.mergeConfig({ ...this.config, words: this.baseWords });
  }

  shuffleLayout(): void {
    this.updateRenderedWords(true);
    this.cdr?.markForCheck();
  }

  trackByTerm(index: number, word: WordCloudRenderModel): string {
    return `${word.term}-${index}`;
  }

  trackCategory(index: number, key: string): string {
    return key;
  }

  private mergeConfig(partial?: WordCloudStatisticsConfig): void {
    const mergedPalette = partial?.palette?.length
      ? [...partial.palette]
      : [...(this.config.palette?.length ? this.config.palette : DEFAULT_CONFIG.palette)];

    const mergedWords = partial?.words?.length
      ? partial.words.map(item => ({ ...item }))
      : this.config.words?.length
        ? this.config.words.map(item => ({ ...item }))
        : this.baseWords.map(item => ({ ...item }));

    const merged: WordCloudStatisticsConfig = {
      ...DEFAULT_CONFIG,
      ...this.config,
      ...partial,
      palette: mergedPalette,
      words: mergedWords
    };

    this.config = merged;
    this.isEditMode = merged.mode === 'edit';
    this.baseWords = merged.words?.length ? merged.words.map(item => ({ ...item })) : [...FALLBACK_WORDS];

    this.updateRenderedWords();
    this.configureAutoRefresh();
    this.cdr?.markForCheck();
  }

  private updateRenderedWords(forceRandomize = false): void {
    const wordsSource = this.config.words?.length ? this.config.words : this.baseWords;
    if (!wordsSource.length) {
      this.renderedWords = [];
      this.dominantTerms = [];
      this.categoryPalette.clear();
      return;
    }

    const sorted = [...wordsSource].sort((a, b) => b.weight - a.weight);
    const limited = sorted.slice(0, this.config.maxWords ?? DEFAULT_CONFIG.maxWords);

    if (forceRandomize || this.config.randomizeOnRefresh) {
      this.randomize(limited);
    }

    const [minWeight, maxWeight] = this.resolveWeightBounds(limited);
    const palette = this.resolvePalette();
    this.categoryPalette.clear();

    let paletteIndex = 0;
    const renderModels = limited.map((item, index) => {
      const normalized = this.normalizeWeight(item.weight, minWeight, maxWeight);
      const fontSize = this.computeFontSize(normalized);
      const color = this.resolveColor(item, palette, index, () => {
        const colorChoice = palette[paletteIndex % palette.length];
        paletteIndex += 1;
        return colorChoice;
      });

      const angle = this.resolveRotation();
      const opacity = 0.58 + normalized * 0.38;
      const emphasis = this.config.highlightThreshold !== undefined
        ? item.weight >= (this.config.highlightThreshold ?? DEFAULT_CONFIG.highlightThreshold)
        : normalized >= 0.78;

      if (item.category) {
        this.categoryPalette.set(item.category, color);
      }

      return {
        term: item.term,
        weight: item.weight,
        category: item.category,
        color,
        fontSize,
        opacity: Number(opacity.toFixed(2)),
        transform: `rotate(${angle}deg)`,
        emphasis
      };
    });

    this.renderedWords = renderModels;
    this.dominantTerms = renderModels.filter(model => model.emphasis).slice(0, 6);
  }

  private configureAutoRefresh(): void {
    this.clearAutoRefresh();
    const intervalMs = this.config.refreshInterval ?? DEFAULT_CONFIG.refreshInterval;

    if (intervalMs && intervalMs > 0) {
      this.autoRefresh = interval(intervalMs)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateRenderedWords(true);
          this.cdr?.markForCheck();
        });
    }
  }

  private clearAutoRefresh(): void {
    if (this.autoRefresh) {
      this.autoRefresh.unsubscribe();
      this.autoRefresh = undefined;
    }
  }

  private resolvePalette(): string[] {
    const palette = this.config.palette?.length ? this.config.palette : DEFAULT_CONFIG.palette;
    return [...palette];
  }

  private resolveWeightBounds(words: WordCloudDatum[]): [number, number] {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const word of words) {
      if (word.weight < min) {
        min = word.weight;
      }
      if (word.weight > max) {
        max = word.weight;
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [0, 1];
    }

    if (min === max) {
      min = 0;
    }

    return [min, max];
  }

  private normalizeWeight(value: number, min: number, max: number): number {
    if (max === min) {
      return 1;
    }

    return (value - min) / (max - min);
  }

  private computeFontSize(normalized: number): number {
    const minFont = this.config.minFontSize ?? DEFAULT_CONFIG.minFontSize;
    const maxFont = this.config.maxFontSize ?? DEFAULT_CONFIG.maxFontSize;
    const safeMin = Math.min(minFont, maxFont);
    const safeMax = Math.max(minFont, maxFont);

    const size = safeMin + normalized * (safeMax - safeMin);
    return Math.round(size);
  }

  private resolveColor(
    word: WordCloudDatum,
    palette: string[],
    index: number,
    nextPaletteColor: () => string
  ): string {
    if (word.color) {
      return word.color;
    }

    if (word.category) {
      const existing = this.categoryPalette.get(word.category);
      if (existing) {
        return existing;
      }

      const color = nextPaletteColor();
      this.categoryPalette.set(word.category, color);
      return color;
    }

    return palette[index % palette.length];
  }

  private resolveRotation(): number {
    if (!this.config.rotate) {
      return 0;
    }

    const angles = this.config.rotationAngles?.length
      ? this.config.rotationAngles
      : DEFAULT_CONFIG.rotationAngles;

    const choice = angles[Math.floor(Math.random() * angles.length)];
    return choice ?? 0;
  }

  private randomize(words: WordCloudDatum[]): void {
    for (let i = words.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
  }

  get categoryPaletteKeys(): string[] {
    return Array.from(this.categoryPalette.keys());
  }
}

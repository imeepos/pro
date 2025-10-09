import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, BehaviorSubject, fromEvent, takeUntil, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { SketchRulerComponent } from './sketch-ruler';
import { RulerGridService, ReferenceLine } from '../../services/ruler-grid.service';
import { CanvasQuery } from '../../services/canvas.query';

@Component({
  selector: 'app-ruler-wrapper',
  standalone: true,
  imports: [CommonModule, SketchRulerComponent],
  template: `
    <div class="ruler-wrapper" [class.show-ruler]="showRuler$ | async">
      <!-- 水平标尺 -->
      <div class="ruler-horizontal" *ngIf="showRuler$ | async">
        <app-sketch-ruler
          #horizontalRuler
          direction="horizontal"
          [scale]="(scale$ | async) ?? 1"
          [width]="canvasWidth"
          [height]="20"
          [startX]="(scrollLeft$ | async) ?? 0"
          [startY]="0"
          [showReferLine]="(showReferenceLines$ | async) ?? false"
          [theme]="themeColors"
          (newLine)="onHorizontalNewLine($event)"
          (lineDrag)="onHorizontalLineDrag($event)">
        </app-sketch-ruler>
      </div>

      <!-- 垂直标尺 -->
      <div class="ruler-vertical" *ngIf="showRuler$ | async">
        <app-sketch-ruler
          #verticalRuler
          direction="vertical"
          [scale]="(scale$ | async) ?? 1"
          [width]="20"
          [height]="canvasHeight"
          [startX]="0"
          [startY]="(scrollTop$ | async) ?? 0"
          [showReferLine]="(showReferenceLines$ | async) ?? false"
          [theme]="themeColors"
          (newLine)="onVerticalNewLine($event)"
          (lineDrag)="onVerticalLineDrag($event)">
        </app-sketch-ruler>
      </div>

      <!-- 角落区域 -->
      <div class="ruler-corner" *ngIf="showRuler$ | async">
        <button
          class="corner-btn"
          (click)="toggleSettings()"
          title="标尺和网格设置">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="m12 1 1.27 2.22L16 2l.78 1.63L19 4l-.78 1.63L19 8l-1.27-.78L16 8l-.78-1.63L12 6l-1.27.78L8 8l-.78-1.63L5 6l.78-1.63L5 2l1.27.78L8 2l.78 1.63z"></path>
          </svg>
        </button>
      </div>

      <!-- 参考线 -->
      <div class="reference-lines" *ngIf="showReferenceLines$ | async">
        <!-- 水平参考线 -->
        <div
          *ngFor="let line of horizontalLines$ | async; trackBy: trackByLineId"
          class="reference-line horizontal-line"
          [style.top.px]="line.position * ((scale$ | async) ?? 1)"
          [style.background-color]="line.color || '#51d3db'"
          [class.locked]="line.locked">
          <div class="line-handle" (mousedown)="onLineMouseDown($event, line, 'horizontal')"></div>
        </div>

        <!-- 垂直参考线 -->
        <div
          *ngFor="let line of verticalLines$ | async; trackBy: trackByLineId"
          class="reference-line vertical-line"
          [style.left.px]="line.position * ((scale$ | async) ?? 1)"
          [style.background-color]="line.color || '#51d3db'"
          [class.locked]="line.locked">
          <div class="line-handle" (mousedown)="onLineMouseDown($event, line, 'vertical')"></div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./ruler-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RulerWrapperComponent implements AfterViewInit, OnDestroy {
  @ViewChild('horizontalRuler') horizontalRuler!: SketchRulerComponent;
  @ViewChild('verticalRuler') verticalRuler!: SketchRulerComponent;

  @Input() canvasWidth = 0;
  @Input() canvasHeight = 0;

  @Output() settingsToggle = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private draggedLine: ReferenceLine | null = null;
  private dragStartPos = 0;
  private dragStartLinePos = 0;

  // 状态观察流
  showRuler$!: Observable<boolean>;
  showGrid$!: Observable<boolean>;
  showReferenceLines$!: Observable<boolean>;
  scale$!: Observable<number>;
  scrollLeft$!: Observable<number>;
  scrollTop$!: Observable<number>;
  horizontalLines$!: Observable<ReferenceLine[]>;
  verticalLines$!: Observable<ReferenceLine[]>;

  themeColors = this.rulerGridService.getThemeColors();

  constructor(
    private rulerGridService: RulerGridService,
    private canvasQuery: CanvasQuery,
    private elementRef: ElementRef<HTMLElement>
  ) {
    this.setupStateSubscriptions();
  }

  ngAfterViewInit(): void {
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupStateSubscriptions(): void {
    this.showRuler$ = this.rulerGridService.showRuler$;
    this.showGrid$ = this.rulerGridService.showGrid$;
    this.showReferenceLines$ = this.rulerGridService.showReferenceLines$;
    this.scale$ = this.canvasQuery.scale$;
    // 简化实现：创建简单的滚动位置观察流
    this.scrollLeft$ = new BehaviorSubject<number>(0).asObservable();
    this.scrollTop$ = new BehaviorSubject<number>(0).asObservable();
    this.horizontalLines$ = this.rulerGridService.referenceLines$.pipe(
      map((lines: ReferenceLine[]) => lines.filter((line: ReferenceLine) => line.type === 'horizontal'))
    );
    this.verticalLines$ = this.rulerGridService.referenceLines$.pipe(
      map((lines: ReferenceLine[]) => lines.filter((line: ReferenceLine) => line.type === 'vertical'))
    );

    // 监听主题变化
    this.rulerGridService.theme$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.themeColors = this.rulerGridService.getThemeColors();
    });
  }

  private setupEventListeners(): void {
    // 监听画布滚动更新标尺位置
    combineLatest([
      this.scrollLeft$,
      this.scrollTop$,
      this.scale$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([scrollLeft, scrollTop, scale]) => {
      if (this.horizontalRuler) {
        this.horizontalRuler.updateStartPos(scrollLeft, 0);
        this.horizontalRuler.updateScale(scale);
      }
      if (this.verticalRuler) {
        this.verticalRuler.updateStartPos(0, scrollTop);
        this.verticalRuler.updateScale(scale);
      }
    });

    // 监听窗口大小变化
    fromEvent<Window>(window, 'resize').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateRulerDimensions();
    });

    // 监听画布大小变化
    this.canvasQuery.canvasStyle$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(style => {
      if (style) {
        this.canvasWidth = style.width;
        this.canvasHeight = style.height;
        this.updateRulerDimensions();
      }
    });
  }

  private updateRulerDimensions(): void {
    if (this.horizontalRuler) {
      this.horizontalRuler.updateDimensions(this.canvasWidth, 20);
    }
    if (this.verticalRuler) {
      this.verticalRuler.updateDimensions(20, this.canvasHeight);
    }
  }

  // 水平标尺创建新参考线
  onHorizontalNewLine(position: number): void {
    this.rulerGridService.addReferenceLine({
      type: 'horizontal',
      position: position
    });
  }

  // 垂直标尺创建新参考线
  onVerticalNewLine(position: number): void {
    this.rulerGridService.addReferenceLine({
      type: 'vertical',
      position: position
    });
  }

  // 水平参考线拖拽
  onHorizontalLineDrag(event: { index: number; value: number }): void {
    const lines = this.rulerGridService.getHorizontalReferenceLines();
    if (lines[event.index]) {
      this.rulerGridService.updateReferenceLine(lines[event.index].id, {
        position: event.value
      });
    }
  }

  // 垂直参考线拖拽
  onVerticalLineDrag(event: { index: number; value: number }): void {
    const lines = this.rulerGridService.getVerticalReferenceLines();
    if (lines[event.index]) {
      this.rulerGridService.updateReferenceLine(lines[event.index].id, {
        position: event.value
      });
    }
  }

  // 参考线拖拽处理
  onLineMouseDown(event: MouseEvent, line: ReferenceLine, type: 'horizontal' | 'vertical'): void {
    if (line.locked) return;

    event.preventDefault();
    event.stopPropagation();

    this.draggedLine = line;
    this.dragStartPos = type === 'horizontal' ? event.clientY : event.clientX;
    this.dragStartLinePos = line.position;

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.draggedLine) return;

      const scale = this.canvasQuery.getValue().scale;
      const currentPos = type === 'horizontal' ? e.clientY : e.clientX;
      const delta = (currentPos - this.dragStartPos) / scale;
      const newPosition = this.dragStartLinePos + delta;

      this.rulerGridService.updateReferenceLine(this.draggedLine.id, {
        position: newPosition
      });
    };

    const handleMouseUp = () => {
      this.draggedLine = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  toggleSettings(): void {
    this.settingsToggle.emit();
  }

  trackByLineId(index: number, line: ReferenceLine): string {
    return line.id;
  }
}
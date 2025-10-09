import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, fromEvent, takeUntil } from 'rxjs';

export interface RulerTheme {
  bgColor?: string;
  longfgColor?: string;
  shortfgColor?: string;
  fontColor?: string;
  shadowColor?: string;
  lineColor?: string;
}

export interface RulerOptions {
  scale: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  ratio: number;
  palette: RulerTheme;
}

@Component({
  selector: 'app-sketch-ruler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas
      #rulerCanvas
      class="block"
      [class.cursor-col-resize]="direction === 'horizontal'"
      [class.cursor-row-resize]="direction === 'vertical'"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseleave)="onMouseLeave()">
    </canvas>
  `,
  styleUrls: ['./sketch-ruler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SketchRulerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rulerCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Input() scale = 1;
  @Input() width = 0;
  @Input() height = 0;
  @Input() startX = 0;
  @Input() startY = 0;
  @Input() showReferLine = true;
  @Input() theme: RulerTheme = {};
  @Input() thick = 20;

  @Output() newLine = new EventEmitter<number>();
  @Output() lineDrag = new EventEmitter<{ index: number; value: number }>();

  private ctx!: CanvasRenderingContext2D;
  private dpr = window.devicePixelRatio || 1;
  private destroy$ = new Subject<void>();
  private isDragging = false;
  private dragStartPos = 0;
  private activeLineIndex = -1;

  readonly DEFAULT_THEME: RulerTheme = {
    bgColor: '#fafafa',
    longfgColor: '#b1b1b1',
    shortfgColor: '#d8d8d8',
    fontColor: '#6f6f6f',
    shadowColor: 'rgba(6, 0, 1, 0.05)',
    lineColor: '#51d3db',
  };

  get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  ngAfterViewInit(): void {
    this.initCanvas();
    this.setupEventListeners();
    this.draw();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initCanvas(): void {
    this.ctx = this.canvas.getContext('2d')!;

    if (this.direction === 'horizontal') {
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.thick * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.thick}px`;
    } else {
      this.canvas.width = this.thick * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.thick}px`;
      this.canvas.style.height = `${this.height}px`;
    }

    this.ctx.scale(this.dpr, this.dpr);
  }

  private setupEventListeners(): void {
    fromEvent<Window>('resize')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.initCanvas();
        this.draw();
      });
  }

  private draw(): void {
    if (!this.ctx) return;

    const options: RulerOptions = {
      scale: this.scale,
      width: this.width,
      height: this.height,
      startX: this.startX,
      startY: this.startY,
      ratio: this.dpr,
      palette: { ...this.DEFAULT_THEME, ...this.theme }
    };

    drawCanvasRuler(
      this.ctx,
      this.direction === 'horizontal' ? this.startX : this.startY,
      0,
      0,
      options,
      this.direction === 'horizontal'
    );
  }

  onMouseDown(event: MouseEvent): void {
    if (!this.showReferLine) return;

    event.preventDefault();
    this.isDragging = true;

    const rect = this.canvas.getBoundingClientRect();
    if (this.direction === 'horizontal') {
      this.dragStartPos = event.clientX - rect.left;
    } else {
      this.dragStartPos = event.clientY - rect.top;
    }

    const globalStart = this.direction === 'horizontal' ? this.startX : this.startY;
    const newValue = Math.round((this.dragStartPos + globalStart) / this.scale);
    this.newLine.emit(newValue);
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    let currentPos: number;

    if (this.direction === 'horizontal') {
      currentPos = event.clientX - rect.left;
    } else {
      currentPos = event.clientY - rect.top;
    }

    const globalStart = this.direction === 'horizontal' ? this.startX : this.startY;
    const newValue = Math.round((currentPos + globalStart) / this.scale);

    if (this.activeLineIndex >= 0) {
      this.lineDrag.emit({ index: this.activeLineIndex, value: newValue });
    }
  }

  onMouseLeave(): void {
    this.isDragging = false;
    this.activeLineIndex = -1;
  }

  setActiveLine(index: number): void {
    this.activeLineIndex = index;
  }

  // 公共方法用于更新标尺
  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initCanvas();
    this.draw();
    this.cdr.markForCheck();
  }

  updateScale(scale: number): void {
    this.scale = scale;
    this.draw();
    this.cdr.markForCheck();
  }

  updateStartPos(startX: number, startY: number): void {
    this.startX = startX;
    this.startY = startY;
    this.draw();
    this.cdr.markForCheck();
  }
}

// Canvas 标尺绘制函数 - 借鉴 openDataV 实现
export function drawCanvasRuler(
  ctx: CanvasRenderingContext2D,
  start: number,
  selectStart: number,
  selectLength: number,
  options: RulerOptions,
  horizontal: boolean = true
): void {
  const { scale, width, height, ratio, palette } = options;
  const bgColor = palette.bgColor || '#fafafa';
  const longfgColor = palette.longfgColor || '#b1b1b1';
  const shortfgColor = palette.shortfgColor || '#d8d8d8';
  const fontColor = palette.fontColor || '#6f6f6f';
  const shadowColor = palette.shadowColor || 'rgba(6, 0, 1, 0.05)';

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 绘制背景
  ctx.fillStyle = bgColor;
  if (horizontal) {
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillRect(0, 0, width, height);
  }

  // 绘制选择区域阴影
  if (selectLength > 0) {
    ctx.fillStyle = shadowColor;
    const shadowX = (selectStart - start) * scale;
    const shadowWidth = selectLength * scale;

    if (horizontal) {
      ctx.fillRect(shadowX, 0, shadowWidth, height);
    } else {
      ctx.fillRect(0, shadowX, width, shadowWidth);
    }
  }

  // 获取网格大小
  const gridSize = getGridSize(scale);
  const gridPixel = gridSize * scale;
  const gridSize10 = gridSize * 10;
  const gridPixel10 = gridSize10 * scale;

  const canvasWidth = horizontal ? width : height;
  const canvasHeight = horizontal ? height : width;
  const longLineCount = Math.ceil(canvasWidth / gridPixel10) + 1;
  const startOffset = -(start * scale) % gridPixel10;

  ctx.fillStyle = fontColor;
  ctx.strokeStyle = longfgColor;
  ctx.lineWidth = 1;
  ctx.font = '10px sans-serif';
  ctx.textAlign = horizontal ? 'center' : 'end';
  ctx.textBaseline = 'middle';

  // 绘制主刻度
  for (let i = 0; i < longLineCount; i++) {
    const x = horizontal ? startOffset + i * gridPixel10 : startOffset + i * gridPixel10;
    const textValue = Math.round(start + (x / scale));
    const text = Math.abs(textValue).toString();

    if (horizontal) {
      ctx.fillRect(x, canvasHeight - 15, 1, 15);
      ctx.fillText(text, x, canvasHeight / 2);
    } else {
      ctx.fillRect(canvasWidth - 15, x, 15, 1);
      ctx.save();
      ctx.translate(canvasWidth / 2, x);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    // 绘制子刻度
    ctx.strokeStyle = shortfgColor;
    for (let j = 1; j < 10; j++) {
      const subX = x + (gridPixel10 * j) / 10;
      if (subX > canvasWidth) break;

      const isLong = j === 5;
      const lineY = isLong ? canvasHeight - 10 : canvasHeight - 5;
      const lineWidth = 1;

      if (horizontal) {
        ctx.fillRect(subX, lineY, lineWidth, canvasHeight - lineY);
      } else {
        ctx.fillRect(lineY, subX, canvasWidth - lineY, lineWidth);
      }
    }
    ctx.strokeStyle = longfgColor;
  }
}

// 智能网格大小计算 - 借鉴 openDataV 算法
function getGridSize(scale: number): number {
  if (scale <= 0.25) return 100;
  if (scale <= 0.5) return 50;
  if (scale <= 1) return 20;
  if (scale <= 2) return 10;
  if (scale <= 4) return 5;
  return 2;
}
import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ruler',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ruler.component.html',
  styleUrls: ['./ruler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulerComponent implements AfterViewInit, OnChanges {
  @Input() direction: 'horizontal' | 'vertical' = 'horizontal';
  @Input() scale = 1;

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly RULER_SIZE = 20;
  private readonly LARGE_TICK_INTERVAL = 50;
  private readonly SMALL_TICK_INTERVAL = 10;
  private readonly BG_COLOR = '#f0f0f0';
  private readonly TICK_COLOR = '#999';
  private readonly TEXT_COLOR = '#666';

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scale'] && !changes['scale'].firstChange) {
      this.render();
    }
  }

  private render(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const isHorizontal = this.direction === 'horizontal';

    if (isHorizontal) {
      const width = canvas.parentElement?.clientWidth || 0;
      canvas.width = width * dpr;
      canvas.height = this.RULER_SIZE * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${this.RULER_SIZE}px`;
    } else {
      const height = canvas.parentElement?.clientHeight || 0;
      canvas.width = this.RULER_SIZE * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${this.RULER_SIZE}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.scale(dpr, dpr);

    ctx.fillStyle = this.BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = this.TICK_COLOR;
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = '10px sans-serif';
    ctx.lineWidth = 1;

    const size = isHorizontal ? canvas.width / dpr : canvas.height / dpr;
    const tickInterval = this.SMALL_TICK_INTERVAL;
    const largeTickInterval = this.LARGE_TICK_INTERVAL;

    for (let i = 0; i <= size; i += tickInterval) {
      const position = i * this.scale;
      const isLargeTick = i % largeTickInterval === 0;
      const tickLength = isLargeTick ? this.RULER_SIZE * 0.6 : this.RULER_SIZE * 0.3;

      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(position, this.RULER_SIZE);
        ctx.lineTo(position, this.RULER_SIZE - tickLength);
      } else {
        ctx.moveTo(this.RULER_SIZE, position);
        ctx.lineTo(this.RULER_SIZE - tickLength, position);
      }
      ctx.stroke();

      if (isLargeTick && i > 0) {
        const label = i.toString();
        const metrics = ctx.measureText(label);

        if (isHorizontal) {
          ctx.fillText(label, position - metrics.width / 2, 10);
        } else {
          ctx.save();
          ctx.translate(10, position);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(label, -metrics.width / 2, 0);
          ctx.restore();
        }
      }
    }
  }
}

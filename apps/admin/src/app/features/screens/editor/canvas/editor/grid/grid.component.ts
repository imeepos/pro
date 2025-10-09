import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RulerGridService } from '../../services/ruler-grid.service';
import { CanvasQuery } from '../../services/canvas.query';

export interface GridTheme {
  smallGridColor?: string;
  largeGridColor?: string;
  smallGridWidth?: number;
  largeGridWidth?: number;
}

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GridComponent implements OnChanges {
  @Input() show = true;
  @Input() customTheme?: GridTheme;
  @Input() baseGridSize = 20;

  // 状态观察流
  showGrid$!: Observable<boolean>;
  scale$!: Observable<number>;
  gridConfig$!: Observable<{ smallGrid: number; largeGrid: number }>;
  theme$!: Observable<GridTheme>;

  constructor(
    private rulerGridService: RulerGridService,
    private canvasQuery: CanvasQuery
  ) {
    this.setupStateSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.show) {
      // show 变化会通过状态管理处理
    }
  }

  private setupStateSubscriptions(): void {
    this.showGrid$ = this.rulerGridService.showGrid$;
    this.scale$ = this.canvasQuery.scale$;

    // 网格配置根据缩放动态调整
    this.gridConfig$ = this.scale$.pipe(
      map(scale => this.rulerGridService.getGridConfig(scale))
    );

    // 主题配置
    this.theme$ = this.rulerGridService.theme$.pipe(
      map(theme => this.getThemeColors(theme))
    );
  }

  private getThemeColors(themeType: 'light' | 'dark'): GridTheme {
    const baseTheme = themeType === 'dark' ? {
      smallGridColor: 'rgba(255, 255, 255, 0.05)',
      largeGridColor: 'rgba(255, 255, 255, 0.1)',
      smallGridWidth: 0.5,
      largeGridWidth: 1
    } : {
      smallGridColor: 'rgba(0, 0, 0, 0.05)',
      largeGridColor: 'rgba(0, 0, 0, 0.1)',
      smallGridWidth: 0.5,
      largeGridWidth: 1
    };

    return { ...baseTheme, ...this.customTheme };
  }
}

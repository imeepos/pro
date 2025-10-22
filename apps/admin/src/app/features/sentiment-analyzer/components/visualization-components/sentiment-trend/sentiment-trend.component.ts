import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrendPoint } from '../../../models/analysis-result.model';

interface ChartSeries {
  readonly label: string;
  readonly color: string;
  readonly points: string;
}

@Component({
  selector: 'sentiment-trend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sentiment-trend.component.html',
  styleUrls: ['./sentiment-trend.component.scss']
})
export class SentimentTrendComponent {
  @Input({ required: true }) trend: readonly TrendPoint[] | null = null;

  readonly series = computed<ChartSeries[]>(() => {
    if (!this.trend || this.trend.length === 0) {
      return [];
    }

    const positive = this.trend.map((point) => point.positive);
    const neutral = this.trend.map((point) => point.neutral);
    const negative = this.trend.map((point) => point.negative);
    const maxValue = Math.max(...positive, ...neutral, ...negative, 1);
    const horizontalStep = this.trend.length > 1 ? 100 / (this.trend.length - 1) : 100;

    const toPoints = (values: number[]) =>
      values
        .map((value, index) => {
          const x = index * horizontalStep;
          const y = 100 - (value / maxValue) * 100;
          return `${x},${y}`;
        })
        .join(' ');

    return [
      {
        label: '积极',
        color: '#34d399',
        points: toPoints(positive)
      },
      {
        label: '中性',
        color: '#facc15',
        points: toPoints(neutral)
      },
      {
        label: '消极',
        color: '#f87171',
        points: toPoints(negative)
      }
    ];
  });
}

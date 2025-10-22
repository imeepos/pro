import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TimelineMoment } from '../../../models/analysis-result.model';

@Component({
  selector: 'timeline-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-view.component.html',
  styleUrls: ['./timeline-view.component.scss'],
  providers: [DatePipe]
})
export class TimelineViewComponent {
  @Input({ required: true }) timeline: readonly TimelineMoment[] | null = null;

  severityColor(moment: TimelineMoment): string {
    switch (moment.impact) {
      case 'high':
        return 'timeline__badge--high';
      case 'medium':
        return 'timeline__badge--medium';
      case 'low':
        return 'timeline__badge--low';
      default:
        return 'timeline__badge--neutral';
    }
  }
}

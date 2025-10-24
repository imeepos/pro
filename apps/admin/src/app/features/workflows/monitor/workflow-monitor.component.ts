import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-monitor.component.html',
  styleUrls: ['./workflow-monitor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowMonitorComponent {}

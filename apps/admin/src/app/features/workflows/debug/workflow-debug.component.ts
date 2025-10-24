import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-debug',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-debug.component.html',
  styleUrls: ['./workflow-debug.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowDebugComponent {}

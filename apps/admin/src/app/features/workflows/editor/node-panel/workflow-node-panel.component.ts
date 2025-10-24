import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WORKFLOW_NODE_BLUEPRINTS } from './workflow-node-blueprints';
import { WorkflowNodeKind } from '../models/workflow-blueprint.model';

@Component({
  selector: 'app-workflow-node-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-node-panel.component.html',
  styleUrls: ['./workflow-node-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowNodePanelComponent {
  readonly blueprints = WORKFLOW_NODE_BLUEPRINTS;

  @Output() addNode = new EventEmitter<WorkflowNodeKind>();

  requestAdd(kind: WorkflowNodeKind): void {
    this.addNode.emit(kind);
  }
}

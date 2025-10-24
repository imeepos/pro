import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-toolbar.component.html',
  styleUrls: ['./workflow-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowToolbarComponent {
  @Input() workflowName = '未命名工作流';
  @Input() dirty = false;
  @Input() saving = false;

  @Output() save = new EventEmitter<void>();
  @Output() execute = new EventEmitter<void>();
  @Output() importDefinition = new EventEmitter<void>();
  @Output() exportDefinition = new EventEmitter<void>();

  triggerSave(): void {
    this.save.emit();
  }

  triggerExecute(): void {
    this.execute.emit();
  }

  triggerImport(): void {
    this.importDefinition.emit();
  }

  triggerExport(): void {
    this.exportDefinition.emit();
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkflowQuery } from '../services/workflow.query';
import { WorkflowEditorService } from '../services/workflow-editor.service';

@Component({
  selector: 'app-workflow-property-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-property-panel.component.html',
  styleUrls: ['./workflow-property-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowPropertyPanelComponent {
  private readonly query = inject(WorkflowQuery);
  private readonly editor = inject(WorkflowEditorService);

  readonly selectedNode$ = this.query.selectedNode$;
  readonly validationIssues$ = this.query.validationIssues$;
  readonly workflowName = toSignal(this.query.select('name'), { initialValue: '未命名工作流' });
  readonly workflowSlug = toSignal(this.query.select('slug'), { initialValue: '' });
  readonly workflowDescription = toSignal(this.query.select('description'), { initialValue: null });
  readonly workflowTags = toSignal(this.query.select('tags'), { initialValue: [] as string[] });

  updateName(value: string): void {
    this.editor.updateMetadata({ name: value.trim() || '未命名工作流' });
  }

  updateSlug(value: string): void {
    const trimmed = value.trim();
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9\-\s_]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    this.editor.updateMetadata({ slug });
  }

  updateDescription(value: string): void {
    const trimmed = value.trim();
    this.editor.updateMetadata({ description: trimmed.length > 0 ? trimmed : null });
  }

  updateTags(value: string): void {
    const tags = Array.from(
      new Set(
        value
          .split(/[\s,]+/)
          .map(tag => tag.trim())
          .filter(Boolean),
      ),
    );
    this.editor.updateMetadata({ tags });
  }
}

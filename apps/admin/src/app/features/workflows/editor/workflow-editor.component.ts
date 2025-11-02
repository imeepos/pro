import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { WorkflowNodePanelComponent } from './node-panel/workflow-node-panel.component';
import { WorkflowCanvasComponent } from './canvas/workflow-canvas.component';
import { WorkflowPropertyPanelComponent } from './property-panel/workflow-property-panel.component';
import { WorkflowToolbarComponent } from './toolbar/workflow-toolbar.component';
import { WORKFLOW_NODE_BLUEPRINTS } from './node-panel/workflow-node-blueprints';
import {
  WorkflowEditorState,
  WorkflowNodeDraft,
  WorkflowNodeKind,
} from './models/workflow-blueprint.model';
import { WorkflowStore } from './services/workflow.store';
import { WorkflowQuery } from './services/workflow.query';
import { WorkflowEditorService } from './services/workflow-editor.service';

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [
    CommonModule,
    WorkflowToolbarComponent,
    WorkflowNodePanelComponent,
    WorkflowCanvasComponent,
    WorkflowPropertyPanelComponent,
  ],
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowEditorComponent implements OnInit {
  private readonly store = inject(WorkflowStore);
  private readonly query = inject(WorkflowQuery);
  private readonly editorService = inject(WorkflowEditorService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly workflowName = toSignal(this.query.select('name'), {
    initialValue: '未命名工作流',
  });
  readonly isDirty = toSignal(this.query.isDirty$, { initialValue: false });
  readonly isSaving = toSignal(this.query.isSaving$, { initialValue: false });
  readonly isLoading = toSignal(this.query.loading$, { initialValue: false });
  readonly loadError = toSignal(this.query.error$, { initialValue: null });
  readonly lastPersistedAt = toSignal(
    this.query.select('lastPersistedAt'),
    { initialValue: null },
  );

  readonly footerStatus = computed(() => {
    if (this.isLoading()) {
      return '正在加载工作流…';
    }
    const lastPersistedAt = this.lastPersistedAt();
    if (!lastPersistedAt) {
      return '尚未保存';
    }

    const date = new Date(lastPersistedAt);
    return `保存于 ${date.toLocaleString()}`;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        void this.editorService.initialize(id);
      });
  }

  handleAddNode(kind: WorkflowNodeKind): void {
    const blueprint = WORKFLOW_NODE_BLUEPRINTS.find(item => item.kind === kind);
    const label = blueprint?.title ?? kind;
    const node: WorkflowNodeDraft = {
      id: this.generateId(),
      key: kind,
      kind,
      label,
      position: this.nextPosition(),
      config: {
        schema: {},
        values: {},
      },
    };

    this.patchState(state => ({
      ...state,
      nodes: [...state.nodes, node],
      selectedNodeId: node.id,
      dirty: true,
    }));
  }

  handleSave(): void {
    void this.editorService.saveCurrent();
  }

  handleExecute(): void {
    // 预留执行入口：此处将接入 GraphQL Mutation
  }

  handleImport(): void {
    void this.editorService.loadTemplate('weibo-detail');
  }

  handleExport(): void {
    // 后续接入 JSON 导出
  }

  reloadCurrent(): void {
    void this.editorService.reload();
  }

  private patchState(updater: (state: WorkflowEditorState) => WorkflowEditorState): void {
    this.store.update(updater);
  }

  private nextPosition(): { x: number; y: number } {
    const count = this.query.getValue().nodes.length;
    const padding = 64;
    const spacing = 280;
    const row = Math.floor(count / 3);
    const column = count % 3;
    return {
      x: padding + column * spacing,
      y: padding + row * 180,
    };
  }

  private generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `node-${Math.random().toString(36).slice(2, 10)}`;
  }
}

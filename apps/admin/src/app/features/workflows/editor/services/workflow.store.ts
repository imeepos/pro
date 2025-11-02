import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import { WorkflowEditorState } from '../models/workflow-blueprint.model';

function randomSlug(): string {
  return `workflow-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInitialState(): WorkflowEditorState {
  return {
    workflowId: null,
    name: '未命名工作流',
    slug: randomSlug(),
    description: null,
    tags: [],
    definitionVersion: 1,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    validationIssues: [],
    dirty: false,
    saving: false,
    lastPersistedAt: null,
    loading: false,
    error: null,
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'workflow-editor' })
export class WorkflowStore extends Store<WorkflowEditorState> {
  constructor() {
    super(createInitialState());
  }

  resetState(partial?: Partial<WorkflowEditorState>): void {
    this.update(() => ({
      ...createInitialState(),
      ...partial,
    }));
  }
}

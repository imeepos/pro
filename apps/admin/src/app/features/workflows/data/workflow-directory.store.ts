import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';

export interface WorkflowSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface WorkflowDirectoryState extends EntityState<WorkflowSummary, string> {
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'workflow-directory', idKey: 'id' })
export class WorkflowDirectoryStore extends EntityStore<WorkflowDirectoryState> {
  constructor() {
    super({
      loading: false,
      error: null,
      lastLoadedAt: null,
    });
  }
}

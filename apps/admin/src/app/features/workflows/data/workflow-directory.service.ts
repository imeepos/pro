import { inject, Injectable } from '@angular/core';
import { GraphqlGateway } from '../../../core/graphql/graphql-gateway.service';
import {
  WorkflowsDocument,
  type WorkflowsQuery,
  type WorkflowsQueryVariables,
} from '../../../core/graphql/generated/graphql';
import { WorkflowDirectoryStore, type WorkflowSummary } from './workflow-directory.store';

@Injectable({ providedIn: 'root' })
export class WorkflowDirectoryService {
  private readonly gateway = inject(GraphqlGateway);
  private readonly store = inject(WorkflowDirectoryStore);

  async refresh(filter?: WorkflowsQueryVariables['filter']): Promise<void> {
    if (!filter) {
      filter = undefined;
    }

    this.store.setLoading(true);
    this.store.setError(null);

    try {
      const result = await this.gateway.request<WorkflowsQuery, WorkflowsQueryVariables>(
        WorkflowsDocument,
        { filter },
      );

      const items = (result.workflows ?? []).map((workflow) => this.toSummary(workflow));

      items.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

      this.store.set(items);
      this.store.update({ lastLoadedAt: Date.now() });
    } catch (error) {
      const reason = (error instanceof Error && error.message) || '加载工作流失败';
      this.store.setError(reason);
      throw error;
    } finally {
      this.store.setLoading(false);
    }
  }

  private toSummary(workflow: WorkflowsQuery['workflows'][number]): WorkflowSummary {
    return {
      id: workflow.id,
      name: workflow.name,
      slug: workflow.slug,
      description: workflow.description ?? null,
      revision: workflow.revision,
      tags: workflow.tags ?? [],
      createdAt: new Date(workflow.createdAt),
      updatedAt: new Date(workflow.updatedAt),
      createdBy: workflow.createdBy ?? null,
      updatedBy: workflow.updatedBy ?? null,
    };
  }
}

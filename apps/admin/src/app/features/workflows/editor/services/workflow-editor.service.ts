import { inject, Injectable } from '@angular/core';
import { GraphqlGateway } from '../../../../core/graphql/graphql-gateway.service';
import {
  SaveWorkflowDocument,
  type SaveWorkflowMutation,
  type SaveWorkflowMutationVariables,
  WorkflowDocument,
  type WorkflowQuery,
  type WorkflowQueryVariables,
} from '../../../../core/graphql/generated/graphql';
import {
  WorkflowEdgeDraft,
  WorkflowEditorState,
  WorkflowNodeDraft,
} from '../models/workflow-blueprint.model';
import {
  WorkflowStore,
  createInitialState,
} from './workflow.store';
import { WorkflowDirectoryService } from '../../data/workflow-directory.service';

type WorkflowModel = NonNullable<WorkflowQuery['workflow']>;

@Injectable({ providedIn: 'root' })
export class WorkflowEditorService {
  private readonly gateway = inject(GraphqlGateway);
  private readonly store = inject(WorkflowStore);
  private readonly directory = inject(WorkflowDirectoryService);

  private currentWorkflowId: string | 'new' | null = null;

  async initialize(workflowId: string | null): Promise<void> {
    this.currentWorkflowId = (workflowId ?? 'new') as string | 'new';

    if (!workflowId || workflowId === 'new') {
      this.store.resetState();
      return;
    }

    this.store.update({
      loading: true,
      error: null,
    });

    try {
      const result = await this.gateway.request<WorkflowQuery, WorkflowQueryVariables>(
        WorkflowDocument,
        { id: workflowId },
      );

      const workflow = result.workflow;
      if (!workflow) {
        throw new Error('未找到指定的工作流。');
      }

      this.store.update(() => this.composeStateFromWorkflow(workflow as WorkflowModel));
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : '加载工作流失败';
      this.store.update({
        loading: false,
        error: reason,
      });
      throw error;
    }
  }

  async reload(): Promise<void> {
    const target = this.currentWorkflowId ?? 'new';
    await this.initialize(target === 'new' ? null : target);
  }

  updateMetadata(metadata: {
    name?: string;
    slug?: string;
    description?: string | null;
    tags?: string[];
  }): void {
    this.store.update(state => {
      const nextName = metadata.name ?? state.name;
      const nextSlug = metadata.slug ?? state.slug;
      const nextDescription =
        metadata.description !== undefined ? metadata.description : state.description;
      const nextTags = metadata.tags ? [...metadata.tags] : state.tags;

      const hasChanged =
        nextName !== state.name ||
        nextSlug !== state.slug ||
        nextDescription !== state.description ||
        !this.areStringArraysEqual(nextTags, state.tags);

      if (!hasChanged) {
        return state;
      }

      return {
        ...state,
        name: nextName,
        slug: nextSlug,
        description: nextDescription,
        tags: nextTags,
        dirty: true,
        error: state.error,
        validationIssues: [],
      };
    });
  }

  async saveCurrent(): Promise<void> {
    const state = this.store.getValue();

    const validationIssues: string[] = [];
    if (!state.name.trim()) {
      validationIssues.push('请填写工作流名称，以便团队理解这条流程。');
    }

    if (!state.slug.trim()) {
      validationIssues.push('请为工作流指定唯一的标识符（slug）。');
    }

    if (validationIssues.length > 0) {
      this.store.update({ validationIssues });
      return;
    }

    this.store.update({
      saving: true,
      error: null,
      validationIssues: [],
    });

    try {
      const payload = this.composeSavePayload(state);

      const result = await this.gateway.request<
        SaveWorkflowMutation,
        SaveWorkflowMutationVariables
      >(SaveWorkflowDocument, {
        input: payload,
      });

      const saved = result.saveWorkflow as WorkflowModel;
      this.currentWorkflowId = saved.id;

      const nextState = this.composeStateFromWorkflow(
        saved,
        state.selectedNodeId,
      );

      this.store.update({
        ...nextState,
        dirty: false,
        saving: false,
      });

      void this.directory.refresh().catch(() => undefined);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : '保存工作流失败';
      this.store.update({
        saving: false,
        validationIssues: [reason],
      });
      throw error;
    }
  }

  private composeStateFromWorkflow(
    workflow: WorkflowModel,
    preservedSelection?: string | null,
  ): WorkflowEditorState {
    const nodes = workflow.definition.nodes.map((node, index) =>
      this.toNodeDraft(node, index),
    );
    const edges = workflow.definition.edges.map(edge => this.toEdgeDraft(edge));

    const selection =
      preservedSelection && nodes.some(node => node.id === preservedSelection)
        ? preservedSelection
        : null;

    return {
      ...createInitialState(),
      workflowId: workflow.id,
      name: workflow.name,
      slug: workflow.slug,
      description: workflow.description ?? null,
      tags: workflow.tags ?? [],
      definitionVersion: workflow.definition.version ?? 1,
      nodes,
      edges,
      selectedNodeId: selection,
      validationIssues: [],
      dirty: false,
      saving: false,
      lastPersistedAt: new Date(workflow.updatedAt).getTime(),
      loading: false,
      error: null,
    };
  }

  private toNodeDraft(
    node: WorkflowModel['definition']['nodes'][number],
    index: number,
  ): WorkflowNodeDraft {
    const fallbackPosition = this.derivePosition(index);
    const position = node.position ?? fallbackPosition;

    return {
      id: node.id,
      key: node.key,
      kind: node.kind as WorkflowNodeDraft['kind'],
      label: node.title,
      position: {
        x: position.x,
        y: position.y,
      },
      config: {
        schema: (node.config?.schema as Record<string, unknown>) ?? {},
        values: (node.config?.values as Record<string, unknown>) ?? {},
      },
      metadata: (node.metadata as Record<string, unknown> | null) ?? null,
    };
  }

  private toEdgeDraft(
    edge: WorkflowModel['definition']['edges'][number],
  ): WorkflowEdgeDraft {
    return {
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      sourcePort: edge.sourcePort ?? null,
      targetPort: edge.targetPort ?? null,
      condition: (edge.condition as Record<string, unknown> | null) ?? null,
    };
  }

  private derivePosition(index: number): { x: number; y: number } {
    const padding = 64;
    const spacingX = 280;
    const spacingY = 180;
    const column = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: padding + column * spacingX,
      y: padding + row * spacingY,
    };
  }

  private composeSavePayload(state: WorkflowEditorState): SaveWorkflowMutationVariables['input'] {
    return {
      id: state.workflowId ?? undefined,
      name: state.name,
      slug: state.slug,
      description: state.description ?? null,
      tags: state.tags,
      definition: {
        version: state.definitionVersion || 1,
        nodes: state.nodes.map(node => ({
          id: node.id,
          key: node.key,
          title: node.label,
          kind: node.kind,
          config: {
            schema: node.config.schema ?? {},
            values: node.config.values ?? {},
          },
          position: {
            x: node.position.x,
            y: node.position.y,
          },
          metadata: node.metadata ?? null,
        })),
        edges: state.edges.map(edge => ({
          id: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          sourcePort: edge.sourcePort ?? null,
          targetPort: edge.targetPort ?? null,
          condition: edge.condition ?? null,
        })),
      },
    };
  }

  private areStringArraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((entry, index) => entry === right[index]);
  }
}

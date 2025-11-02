import type { WorkflowGraphAst } from '../ast';
import type { IEdge } from '../types';

export interface WorkflowNodeDraft {
  id: string;
  key: string;
  kind: string;
  label: string;
  position: { x: number; y: number };
  config: {
    schema: Record<string, unknown>;
    values: Record<string, unknown>;
  };
  metadata?: Record<string, unknown> | null;
}

export interface WorkflowEdgeDraft {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort?: string | null;
  targetPort?: string | null;
  condition?: Record<string, unknown> | null;
}

const TYPE_TO_KIND_MAP: Record<string, string> = {
  WeiboAjaxStatusesShowAst: 'WEIBO_AJAX_STATUSES_SHOW',
  WeiboAjaxStatusesRepostTimelineAst: 'WEIBO_AJAX_STATUSES_REPOST_TIMELINE',
  WeiboAjaxStatusesMymblogAst: 'WEIBO_AJAX_STATUSES_MYMBLOG',
  WeiboAjaxStatusesLikeShowAst: 'WEIBO_AJAX_STATUSES_LIKE_SHOW',
  WeiboAjaxStatusesCommentAst: 'WEIBO_AJAX_STATUSES_COMMENT',
  WeiboAjaxProfileInfoAst: 'WEIBO_AJAX_PROFILE_INFO',
};

const GRID_COLUMNS = 3;
const GRID_SPACING_X = 280;
const GRID_SPACING_Y = 180;

function calculatePosition(index: number): { x: number; y: number } {
  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  return {
    x: column * GRID_SPACING_X,
    y: row * GRID_SPACING_Y,
  };
}

function convertNodeType(type: string): string {
  return TYPE_TO_KIND_MAP[type] || type;
}

function createEdgeId(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`;
}

export interface AdminWorkflowFormat {
  name: string;
  nodes: WorkflowNodeDraft[];
  edges: WorkflowEdgeDraft[];
}

export function convertWorkflowToAdminFormat(
  workflow: WorkflowGraphAst,
): AdminWorkflowFormat {
  const nodes: WorkflowNodeDraft[] = workflow.nodes.map((node, index) => ({
    id: node.id,
    key: node.type,
    kind: convertNodeType(node.type),
    label: convertNodeType(node.type),
    position: calculatePosition(index),
    config: {
      schema: {},
      values: {},
    },
  }));

  const edges: WorkflowEdgeDraft[] = workflow.edges.map((edge: IEdge) => {
    const from = 'from' in edge ? edge.from : '';
    const to = 'to' in edge ? edge.to : '';
    const fromProperty = 'fromProperty' in edge ? edge.fromProperty : undefined;
    const toProperty = 'toProperty' in edge ? edge.toProperty : undefined;
    const condition = 'condition' in edge ? edge.condition : undefined;

    return {
      id: createEdgeId(from, to),
      sourceId: from,
      targetId: to,
      sourcePort: fromProperty || null,
      targetPort: toProperty || null,
      condition: condition || null,
    };
  });

  return {
    name: workflow.name || 'Untitled Workflow',
    nodes,
    edges,
  };
}

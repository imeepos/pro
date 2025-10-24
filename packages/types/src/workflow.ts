export type WorkflowNodeKind =
  | 'PLAYWRIGHT_FETCH'
  | 'ACCOUNT_INJECTOR'
  | 'WEIBO_KEYWORD_SEARCH'
  | 'WEIBO_SEARCH_URL_BUILDER'
  | 'WEIBO_DETAIL_FETCH'
  | 'WEIBO_USER_PROFILE'
  | 'WEIBO_COMMENTS'
  | 'WEIBO_LIKES'
  | 'WEIBO_SHARES'
  | 'MQ_PUBLISH'
  | 'STORAGE_SINK';

export interface WorkflowCanvasPoint {
  x: number;
  y: number;
}

export interface WorkflowNodeConfigDefinition {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
}

export interface WorkflowNodeDefinition {
  id: string;
  key: string;
  title: string;
  kind: WorkflowNodeKind;
  config: WorkflowNodeConfigDefinition;
  position?: WorkflowCanvasPoint;
  metadata?: Record<string, unknown>;
}

export interface WorkflowEdgeDefinition {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort?: string | null;
  targetPort?: string | null;
  condition?: Record<string, unknown> | null;
}

export interface WorkflowDefinition {
  version: number;
  nodes: WorkflowNodeDefinition[];
  edges: WorkflowEdgeDefinition[];
}

export enum WorkflowExecutionStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WorkflowNodeState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
}

export interface WorkflowExecutionMetrics {
  totalNodes: number;
  succeededNodes: number;
  failedNodes: number;
  throughput?: number | null;
  payloadSize?: number | null;
}

export interface Workflow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  tags: string[];
  revision: number;
  definition: WorkflowDefinition;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  revision: number;
  status: WorkflowExecutionStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  durationMs?: number | null;
  triggeredBy: string;
  context?: Record<string, unknown> | null;
  metrics?: WorkflowExecutionMetrics | null;
  logsPointer?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

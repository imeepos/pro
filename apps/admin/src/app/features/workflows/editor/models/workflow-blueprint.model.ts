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

export interface WorkflowNodeBlueprint {
  kind: WorkflowNodeKind;
  title: string;
  subtitle: string;
  accentColor: string;
}

export interface WorkflowNodeDraft {
  id: string;
  key: string;
  kind: WorkflowNodeKind;
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

export interface WorkflowEditorState {
  workflowId: string | null;
  name: string;
  slug: string;
  description: string | null;
  tags: string[];
  definitionVersion: number;
  nodes: WorkflowNodeDraft[];
  edges: WorkflowEdgeDraft[];
  selectedNodeId: string | null;
  validationIssues: string[];
  dirty: boolean;
  saving: boolean;
  lastPersistedAt: number | null;
  loading: boolean;
  error: string | null;
}

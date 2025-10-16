export interface ScreenLayout {
  width: number;
  height: number;
  background?: string;
  grid?: {
    enabled?: boolean;
    size?: number;
  };
  cols?: number;
  rows?: number;
}

export interface ScreenComponentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface ScreenComponentDataSource {
  type: 'api' | 'static';
  url?: string;
  data?: unknown;
  refreshInterval?: number;
}

export interface ScreenComponentDefinition {
  id: string;
  type: string;
  position: ScreenComponentPosition;
  config: Record<string, unknown>;
  dataSource?: ScreenComponentDataSource;
}

export type ScreenStatus = 'draft' | 'published';

export interface ScreenPage {
  id: string;
  name: string;
  description?: string;
  layout: ScreenLayout;
  components: ScreenComponentDefinition[];
  status: ScreenStatus;
  isDefault?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreenConnectionEdge<T> {
  cursor: string;
  node: T;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface ScreenConnection {
  edges: Array<ScreenConnectionEdge<ScreenPage>>;
  pageInfo: PageInfo;
  totalCount: number;
}

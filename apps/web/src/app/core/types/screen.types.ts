export interface ScreenLayout {
  width: number;
  height: number;
  background?: string;
  grid?: {
    size?: number;
    enabled?: boolean;
  };
}

interface LegacyLayout {
  cols?: number;
  rows?: number;
}

export interface ScreenComponentConfig {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  config: unknown;
  dataSource?: {
    type: 'api' | 'static';
    url?: string;
    data?: unknown;
    refreshInterval?: number;
  };
}

export interface ScreenPage {
  id: string;
  name: string;
  description?: string;
  layout: ScreenLayout;
  components: ScreenComponentConfig[];
  status: 'draft' | 'published';
  isDefault?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreenList {
  items: ScreenPage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type LayoutInput = ScreenLayout | LegacyLayout | undefined | null;

export function normalizeLayout(layout: LayoutInput): ScreenLayout {
  if (!layout) {
    return {
      width: 1920,
      height: 1080
    };
  }

  if ('width' in layout && 'height' in layout) {
    return layout as ScreenLayout;
  }

  const { cols, rows } = layout as LegacyLayout;
  if (cols && rows) {
    const GRID_UNIT = 50;
    return {
      width: cols * GRID_UNIT,
      height: rows * GRID_UNIT
    };
  }

  return {
    width: 1920,
    height: 1080
  };
}

export function normalizeScreenPage(payload: any): ScreenPage {
  return {
    ...payload,
    layout: normalizeLayout(payload?.layout ?? null),
    components: Array.isArray(payload?.components) ? payload.components : []
  };
}

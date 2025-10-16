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

type RawComponent = {
  id?: unknown;
  componentId?: unknown;
  type?: unknown;
  position?: unknown;
  config?: unknown;
  dataSource?: unknown;
};

type RawComponentPosition = {
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  zIndex?: unknown;
};

type RawComponentDataSource = {
  type?: unknown;
  url?: unknown;
  data?: unknown;
  refreshInterval?: unknown;
};

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
  const rawComponents = Array.isArray(payload?.components)
    ? (payload.components as unknown[])
    : [];

  const components = rawComponents
    .map(entry => normalizeScreenComponent(entry))
    .filter(
      (component): component is ScreenComponentConfig =>
        component !== null && component !== undefined
    );

  return {
    id: String(payload?.id ?? ''),
    name: String(payload?.name ?? ''),
    description: payload?.description ?? undefined,
    layout: normalizeLayout(payload?.layout ?? null),
    components,
    status: normalizeScreenStatus(payload?.status),
    isDefault: Boolean(payload?.isDefault),
    createdBy: String(payload?.createdBy ?? ''),
    createdAt: String(payload?.createdAt ?? ''),
    updatedAt: String(payload?.updatedAt ?? '')
  };
}

function normalizeScreenStatus(status: unknown): 'draft' | 'published' {
  if (typeof status === 'string') {
    const lower = status.toLowerCase();
    if (lower === 'draft' || lower === 'published') {
      return lower;
    }
  }
  return 'draft';
}

function normalizeScreenComponent(entry: unknown): ScreenComponentConfig | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const component = entry as RawComponent;
  const id = component.id ?? component.componentId;
  const type = component.type;
  const position = normalizeComponentPosition(component.position);

  if (!id || !type || !position) {
    return null;
  }

  return {
    id: String(id),
    type: String(type),
    position,
    config: component.config,
    dataSource: normalizeComponentDataSource(component.dataSource)
  };
}

function normalizeComponentPosition(
  position: unknown
): ScreenComponentConfig['position'] | null {
  if (!position || typeof position !== 'object') {
    return null;
  }

  const coords = position as RawComponentPosition;
  const x = Number(coords.x ?? 0);
  const y = Number(coords.y ?? 0);
  const width = Number(coords.width ?? 0);
  const height = Number(coords.height ?? 0);
  const zIndex = Number(coords.zIndex ?? 0);

  return { x, y, width, height, zIndex };
}

function normalizeComponentDataSource(
  dataSource: unknown
): ScreenComponentConfig['dataSource'] | undefined {
  if (!dataSource || typeof dataSource !== 'object') {
    return undefined;
  }

  const source = dataSource as RawComponentDataSource;
  const type = normalizeDataSourceType(source.type);
  if (!type) {
    return undefined;
  }

  return {
    type,
    url: typeof source.url === 'string' ? source.url : undefined,
    data: source.data ?? undefined,
    refreshInterval:
      typeof source.refreshInterval === 'number' ? source.refreshInterval : undefined
  };
}

function normalizeDataSourceType(type: unknown): 'api' | 'static' | undefined {
  if (typeof type !== 'string') {
    return undefined;
  }

  const normalized = type.toLowerCase();
  if (normalized === 'api' || normalized === 'static') {
    return normalized;
  }

  return undefined;
}

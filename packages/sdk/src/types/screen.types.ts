/**
 * 屏幕布局配置
 */
export interface LayoutConfig {
  width: number;
  height: number;
  background?: string;
  grid?: {
    size?: number;
    enabled?: boolean;
  };
}

/**
 * 兼容旧格式的 LayoutConfig 接口
 */
interface LegacyLayoutConfig {
  cols?: number;
  rows?: number;
}

/**
 * 组件定义
 */
export interface Component {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  config: any;
  dataSource?: {
    type: 'api' | 'static';
    url?: string;
    data?: any;
    refreshInterval?: number;
  };
}

/**
 * 屏幕页面
 */
export interface ScreenPage {
  id: string;
  name: string;
  description?: string;
  layout: LayoutConfig;
  components: Component[];
  status: 'draft' | 'published';
  isDefault?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建屏幕 DTO
 */
export interface CreateScreenDto {
  name: string;
  description?: string;
  layout: LayoutConfig;
  components?: Component[];
}

/**
 * 更新屏幕 DTO
 */
export interface UpdateScreenDto {
  name?: string;
  description?: string;
  layout?: LayoutConfig;
  components?: Component[];
}

/**
 * 屏幕专用的 API 响应格式
 */
export interface ScreenApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * 屏幕列表响应
 */
export interface ScreenListResponse {
  items: ScreenPage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 标准化布局数据
 */
export function normalizeLayoutData(layout: LayoutConfig | LegacyLayoutConfig): LayoutConfig {
  // 如果已经是新格式（width/height），直接返回
  if ('width' in layout && 'height' in layout) {
    return layout as LayoutConfig;
  }

  // 处理旧格式数据（cols/rows）
  const legacyLayout = layout as LegacyLayoutConfig;

  // 默认值
  const defaultWidth = 1920;
  const defaultHeight = 1080;

  // 如果有栅格数据，转换为像素
  if (legacyLayout.cols && legacyLayout.rows) {
    const gridPixelSize = 50; // 每个栅格50px

    return {
      width: legacyLayout.cols * gridPixelSize,
      height: legacyLayout.rows * gridPixelSize
    };
  }

  // 如果没有完整的尺寸信息，返回默认值
  return {
    width: defaultWidth,
    height: defaultHeight
  };
}

/**
 * 标准化页面数据
 */
export function normalizeScreenPageData(screen: any): ScreenPage {
  return {
    ...screen,
    layout: normalizeLayoutData(screen.layout)
  };
}
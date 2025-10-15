/**
 * 统一的布局系统类型定义
 * 用于替代现有的分散类型定义，提供类型安全和一致性
 */

// ================== 核心类型 ==================

/**
 * 组件引用类型 - 统一组件标识方式
 */
export interface ComponentReference {
  /** 组件类型 */
  type: 'built-in' | 'custom';
  /** 组件名称（用于注册表查找） */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 组件类别 */
  category: string;
}

/**
 * 位置和尺寸信息
 */
export interface Position {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 尺寸约束
 */
export interface SizeConstraints {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

/**
 * 网格配置
 */
export interface GridConfig {
  /** 列数 */
  cols: number;
  /** 行高 */
  rowHeight: number;
  /** 间距 */
  gap: number;
}

/**
 * 布局项 - 统一的布局元素定义
 */
export interface LayoutItem {
  /** 唯一标识 */
  id: string;
  /** 位置和尺寸 */
  position: Position;
  /** 组件引用 */
  component: ComponentReference;
  /** 尺寸约束 */
  constraints?: SizeConstraints;
  /** 组件属性 */
  props: Record<string, unknown>;
  /** 是否锁定（不可编辑） */
  locked?: boolean;
}

/**
 * 布局元数据
 */
export interface LayoutMetadata {
  /** 类别 */
  category: string;
  /** 缩略图 */
  thumbnail?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 创建者 */
  createdBy?: string;
  /** 标签 */
  tags?: string[];
}

/**
 * 统一的布局配置 - 新的核心数据模型
 */
export interface LayoutConfig {
  /** 唯一标识 */
  id: string;
  /** 布局名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 网格配置 */
  grid: GridConfig;
  /** 布局项列表 */
  items: LayoutItem[];
  /** 元数据 */
  metadata: LayoutMetadata;
}

// ================== 组件注册系统 ==================

/**
 * 组件配置
 */
export interface ComponentConfig {
  /** 显示名称 */
  displayName: string;
  /** 组件类别 */
  category: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 默认尺寸 */
  defaultSize: { w: number; h: number };
  /** 最小尺寸 */
  minSize?: { w: number; h: number };
  /** 最大尺寸 */
  maxSize?: { w: number; h: number };
  /** 默认属性 */
  defaultProps: Record<string, unknown>;
  /** 属性模式（用于验证和编辑器） */
  propsSchema?: JSONSchema;
}

/**
 * 注册的组件
 */
export interface RegisteredComponent {
  /** 组件名称 */
  name: string;
  /** React 组件 */
  component: React.ComponentType<any>;
  /** 组件配置 */
  config: ComponentConfig;
}

/**
 * 组件注册表接口
 */
export interface ComponentRegistry {
  /** 注册组件 */
  register<T extends Record<string, unknown>>(
    name: string,
    component: React.ComponentType<T>,
    config: ComponentConfig
  ): void;
  
  /** 获取组件 */
  get(name: string): RegisteredComponent | undefined;
  
  /** 获取所有组件 */
  list(): RegisteredComponent[];
  
  /** 按类别获取组件 */
  getByCategory(category: string): RegisteredComponent[];
  
  /** 取消注册组件 */
  unregister(name: string): void;
}

// ================== JSON Schema 类型 ==================

/**
 * 简化的 JSON Schema 定义（用于属性验证）
 */
export interface JSONSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  title?: string;
  description?: string;
}

// ================== 布局操作类型 ==================

/**
 * 布局操作类型
 */
export type LayoutOperation = 
  | { type: 'ADD_ITEM'; item: Omit<LayoutItem, 'id'> }
  | { type: 'UPDATE_ITEM'; itemId: string; updates: Partial<LayoutItem> }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'MOVE_ITEM'; itemId: string; position: Position }
  | { type: 'RESIZE_ITEM'; itemId: string; position: Position }
  | { type: 'UPDATE_GRID'; grid: Partial<GridConfig> }
  | { type: 'UPDATE_METADATA'; metadata: Partial<LayoutMetadata> };

/**
 * 布局操作历史
 */
export interface LayoutHistory {
  /** 操作列表 */
  operations: LayoutOperation[];
  /** 当前位置 */
  currentIndex: number;
  /** 最大历史记录数 */
  maxSize: number;
}

// ================== 验证和工具类型 ==================

/**
 * 类型守卫：检查是否为有效的布局配置
 */
export function isValidLayoutConfig(obj: unknown): obj is LayoutConfig {
  if (!obj || typeof obj !== 'object') return false;
  
  const layout = obj as Record<string, unknown>;
  
  return (
    typeof layout.id === 'string' &&
    typeof layout.name === 'string' &&
    typeof layout.grid === 'object' &&
    Array.isArray(layout.items) &&
    typeof layout.metadata === 'object'
  );
}

/**
 * 类型守卫：检查是否为有效的布局项
 */
export function isValidLayoutItem(obj: unknown): obj is LayoutItem {
  if (!obj || typeof obj !== 'object') return false;
  
  const item = obj as Record<string, unknown>;
  
  return (
    typeof item.id === 'string' &&
    typeof item.position === 'object' &&
    typeof item.component === 'object' &&
    typeof item.props === 'object'
  );
}

/**
 * 类型守卫：检查是否为有效的组件引用
 */
export function isValidComponentReference(obj: unknown): obj is ComponentReference {
  if (!obj || typeof obj !== 'object') return false;
  
  const ref = obj as Record<string, unknown>;
  
  return (
    (ref.type === 'built-in' || ref.type === 'custom') &&
    typeof ref.name === 'string' &&
    typeof ref.displayName === 'string' &&
    typeof ref.category === 'string'
  );
}

// ================== 类型清理完成 ==================
// 所有旧的兼容类型和转换函数已移除，请使用统一的 LayoutItem 和相关类型
export interface TableColumn<T = any> {
  key: keyof T;
  title: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T) => string;
  formatter?: (value: any) => string;
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[];
  pageSize?: number;
  showPagination?: boolean;
  showSizeChanger?: boolean;
  showSelection?: boolean;
  showActions?: boolean;
  bordered?: boolean;
  size?: 'small' | 'middle' | 'large';
  scroll?: { x?: string; y?: string };
  filterable?: boolean;
}

export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  total: number;
  showSizeChanger: boolean;
  pageSizeOptions: number[];
}

export interface FilterConfig {
  keyword: string;
  filters: Record<string, any>;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface SortConfig {
  field: string;
  order: 'asc' | 'desc' | null;
}

export interface TableState<T = any> {
  data: T[];
  loading: boolean;
  pagination: PaginationConfig;
  filter: FilterConfig;
  sort: SortConfig;
  selectedRows: T[];
}

export interface BatchAction {
  key: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  minItems?: number;
  maxItems?: number;
  disabledReason?: string;
  showConfirm?: boolean;
  showCount?: boolean;
  description?: string;
  action: (selectedItems: any[]) => void | Promise<void>;
}

export interface DataStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  lastUpdated: string;
}

export interface RealTimeUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  timestamp: string;
}
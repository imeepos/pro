export type Color = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ComponentBase {
  color?: Color;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
}

export interface InteractiveElement {
  click?: () => void;
  focus?: () => void;
  blur?: () => void;
}

export interface FormElement extends ComponentBase {
  value?: any;
  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => string;
}

export interface TableAction {
  label: string;
  icon?: string;
  color?: Color;
  action: (row: any) => void;
  disabled?: (row: any) => boolean;
  danger?: boolean;
}

export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  pageSizeOptions?: number[];
}

export interface ModalConfig {
  title?: string;
  width?: string;
  closable?: boolean;
  maskClosable?: boolean;
  centered?: boolean;
}

export interface DropdownItem {
  label: string;
  value: any;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  badge?: {
    text: string;
    color?: Color;
  };
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}
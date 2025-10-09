export type FormItemType =
  | 'input'
  | 'number'
  | 'textarea'
  | 'select'
  | 'switch'
  | 'color'
  | 'slider'
  | 'radio'
  | 'checkbox'
  | 'group';

export interface FormMetadata {
  type: FormItemType;
  label: string;
  key: string | string[];
  value?: any;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: any }>;
  children?: FormMetadata[];
  showIf?: (formData: any) => boolean;
  disabled?: boolean;
  tooltip?: string;
}

export interface FormConfig {
  items: FormMetadata[];
}

export interface FormChangeEvent {
  keys: string[];
  value: any;
}

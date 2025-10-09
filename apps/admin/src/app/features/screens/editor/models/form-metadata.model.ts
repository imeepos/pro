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

export type ValidationType = 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'color' | 'range';

export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
}

export type ValidationStatus = 'valid' | 'invalid' | 'warning' | 'pending';

export interface ValidationResult {
  status: ValidationStatus;
  message?: string;
  isValid: boolean;
}

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
  // 验证相关属性
  required?: boolean;
  validationRules?: ValidationRule[];
  realtimeValidation?: boolean;
}

export interface FormConfig {
  items: FormMetadata[];
}

export interface FormChangeEvent {
  keys: string[];
  value: any;
}

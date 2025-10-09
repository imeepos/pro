export interface ComponentItem {
  id: string;
  type: string;
  component: string;
  style: ComponentStyle;
  config: Record<string, any>;
  locked?: boolean;
  display?: boolean;
  parent?: ComponentItem;
  isGroup?: boolean;
  children?: ComponentItem[];
  hasError?: boolean;
  errorInfo?: ComponentErrorInfo;
}

export interface ComponentErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  phase: 'init' | 'render' | 'data' | 'unknown';
}

export interface ComponentStyle {
  top: number;
  left: number;
  width: number;
  height: number;
  rotate: number;
  zIndex?: number;
  opacity?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderColor?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  boxShadow?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

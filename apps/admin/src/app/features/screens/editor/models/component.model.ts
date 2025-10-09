export interface ComponentItem {
  id: string;
  type: string;
  component: string;
  style: ComponentStyle;
  config: Record<string, any>;
  locked?: boolean;
  display?: boolean;
  parent?: ComponentItem;
}

export interface ComponentStyle {
  top: number;
  left: number;
  width: number;
  height: number;
  rotate: number;
  zIndex?: number;
  opacity?: number;
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

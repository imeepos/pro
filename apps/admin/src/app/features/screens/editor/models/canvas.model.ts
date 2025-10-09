export interface CanvasStyle {
  width: number;
  height: number;
  background: string | BackgroundStyle;
}

export interface BackgroundStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
}

export type EditMode = 'edit' | 'preview';

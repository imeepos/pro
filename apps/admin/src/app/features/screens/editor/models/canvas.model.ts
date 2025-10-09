export interface CanvasStyle {
  width: number;
  height: number;
  background: string | BackgroundStyle;
  className?: string;
  dataAttrs?: Record<string, string>;
  description?: string;
}

export interface BackgroundStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundAttachment?: string;
  backgroundBlendMode?: string;
  opacity?: number;
  gradient?: GradientStyle;
}

export interface GradientStyle {
  type: 'linear' | 'radial' | 'conic';
  angle?: number;
  colors: GradientColorStop[];
}

export interface GradientColorStop {
  color: string;
  position: number;
}

export type EditMode = 'edit' | 'preview';

export interface ResolutionPreset {
  label: string;
  width: number;
  height: number;
  category: 'desktop' | 'mobile' | 'tablet' | 'custom';
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { label: '4K (3840×2160)', width: 3840, height: 2160, category: 'desktop' },
  { label: '2K (2560×1440)', width: 2560, height: 1440, category: 'desktop' },
  { label: '1080P (1920×1080)', width: 1920, height: 1080, category: 'desktop' },
  { label: '720P (1280×720)', width: 1280, height: 720, category: 'desktop' },
  { label: 'iPad (1024×768)', width: 1024, height: 768, category: 'tablet' },
  { label: 'iPad Pro (1366×1024)', width: 1366, height: 1024, category: 'tablet' },
  { label: 'iPhone (375×667)', width: 375, height: 667, category: 'mobile' },
  { label: 'iPhone X (375×812)', width: 375, height: 812, category: 'mobile' },
  { label: 'Android (360×640)', width: 360, height: 640, category: 'mobile' },
];

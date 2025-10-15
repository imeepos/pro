/**
 * Utility functions to ensure safe gradient creation for ECharts
 * Prevents "Failed to execute 'addColorStop' on 'CanvasGradient'" errors
 */

/**
 * Safely creates a linear gradient configuration for ECharts
 */
export function createSafeLinearGradient(config: {
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  colorStops: Array<{
    offset: number;
    color: string;
  }>;
}) {
  // Validate colorStops
  const safeColorStops = config.colorStops.map(stop => ({
    offset: stop.offset,
    color: stop.color || '#6b7280' // fallback color
  }));

  // Ensure we have valid color values
  const validatedStops = safeColorStops.filter(stop => 
    typeof stop.color === 'string' && stop.color.trim() !== ''
  );

  // If no valid stops, provide default
  if (validatedStops.length === 0) {
    validatedStops.push(
      { offset: 0, color: '#6b7280' },
      { offset: 1, color: '#4b5563' }
    );
  }

  return {
    type: 'linear',
    x: config.x ?? 0,
    y: config.y ?? 0,
    x2: config.x2 ?? 0,
    y2: config.y2 ?? 1,
    colorStops: validatedStops
  };
}

/**
 * Validates that a color string is valid for Canvas gradients
 */
export function isValidColor(color: unknown): color is string {
  if (typeof color !== 'string') return false;
  if (!color.trim()) return false;
  
  // Check for common valid color formats
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/;
  
  return hexPattern.test(color) || rgbPattern.test(color) || color === 'transparent';
}

/**
 * Safely concatenates color with opacity
 */
export function addColorOpacity(color: string, opacity: string): string {
  if (!isValidColor(color)) {
    return '#6b7280' + opacity;
  }
  return color + opacity;
}

/**
 * List of all chart components that have been fixed for gradient safety
 */
export const GRADIENT_SAFE_COMPONENTS = [
  'PostCountChart',
  'EventCountChart', 
  'SimpleSentimentPieChart',
  'EmotionCurveChart',
  'MiniTrendChart',
  'TimeSeriesChart',
  'SentimentTrendChart',
  'AgeDistributionChart',
  'HotTopicsChart',
  'WordCloudChart',
  'GenderDistributionChart'
] as const;
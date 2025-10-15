/**
 * Chart utility functions to prevent Canvas gradient errors
 */

/**
 * Validates chart data before creating ECharts options
 * Prevents "Failed to execute 'addColorStop' on 'CanvasGradient'" errors
 * when data is empty or undefined
 */
export function validateChartData(data: unknown): boolean {
  if (!data) return false;

  if (Array.isArray(data)) {
    return data.length > 0;
  }

  if (typeof data === 'object') {
    // Check if object has any meaningful data
    const values = Object.values(data);
    return values.some(value => (Array.isArray(value) ? value.length > 0 : value != null));
  }

  return data != null;
}

/**
 * Safe wrapper for creating ECharts options with data validation
 */
export function createSafeChartOption<T>(data: unknown, optionBuilder: () => T): T | null {
  if (!validateChartData(data)) {
    return null;
  }

  try {
    return optionBuilder();
  } catch (error) {
    console.warn('Error creating chart option:', error);
    return null;
  }
}

/**
 * Common loading component for charts
 */
export const ChartLoadingComponent = ({
  height,
  className = '',
}: {
  height?: number | string;
  className?: string;
}) => (
  <div
    className={`flex items-center justify-center text-muted-foreground ${className}`}
    style={{ height: height ? `${height}px` : '100%' }}
  >
    加载中...
  </div>
);

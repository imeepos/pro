/**
 * Debug utility to trace the source of gradient color errors
 */
import { useEffect } from 'react';

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

// Track component rendering
const componentRenderStack: string[] = [];

export function enableGradientDebugging() {
  // Override console.error to catch gradient errors
  console.error = function(...args: any[]) {
    const message = args.join(' ');
    if (message.includes('addColorStop') || message.includes('CanvasGradient')) {
      console.group('🔴 GRADIENT ERROR DETECTED');
      console.log('Error message:', message);
      console.log('Current component stack:', componentRenderStack);
      console.log('Full arguments:', args);
      console.trace('Call stack:');
      console.groupEnd();
      
      // 触发断点帮助调试
      debugger;
    }
    originalError.apply(console, args);
  };

  // 捕获未处理的 SyntaxError
  window.addEventListener('error', function(e) {
    if (e.message.includes('addColorStop') || e.message.includes('CanvasGradient')) {
      console.group('🔴 WINDOW ERROR - GRADIENT DETECTED');
      console.log('Error:', e.error);
      console.log('Message:', e.message);
      console.log('Filename:', e.filename);
      console.log('Line:', e.lineno);
      console.log('Column:', e.colno);
      console.log('Current component stack:', componentRenderStack);
      console.trace('Call stack:');
      console.groupEnd();
      debugger;
    }
  });

  // 拦截所有 ECharts 实例的创建和配置
  if (typeof window !== 'undefined') {
    // 等待 ECharts 加载
    const checkECharts = () => {
      if (window.echarts) {
        const originalInit = window.echarts.init;
        window.echarts.init = function(container: any, theme: any, opts: any) {
          console.log('📊 ECharts.init called for container:', container);
          const chart = originalInit.call(this, container, theme, opts);
          
          // 拦截 setOption 方法
          const originalSetOption = chart.setOption;
          chart.setOption = function(option: any, ...args: any[]) {
            console.group('🎯 ECharts setOption called');
            console.log('Container:', container);
            console.log('Container ID:', container?.id || 'unknown');
            console.log('Container className:', container?.className || 'unknown');
            console.log('Option:', option);
            console.log('Component stack:', componentRenderStack);
            
            // 深度扫描undefined颜色
            const undefinedColors = scanForUndefinedColors(option, 'ROOT');
            if (undefinedColors.length > 0) {
              console.error('🚨 FOUND UNDEFINED COLORS:', undefinedColors);
              // 立即触发断点
              debugger;
            }
            console.groupEnd();
            
            return originalSetOption.call(this, option, ...args);
          };
          
          return chart;
        };
      } else {
        setTimeout(checkECharts, 100);
      }
    };
    
    checkECharts();
  }
}

export function disableGradientDebugging() {
  console.error = originalError;
  console.warn = originalWarn;
}

export function trackComponentRender(componentName: string) {
  componentRenderStack.push(componentName);
  return () => {
    const index = componentRenderStack.indexOf(componentName);
    if (index > -1) {
      componentRenderStack.splice(index, 1);
    }
  };
}

function scanForUndefinedColors(obj: any, path: string = ''): string[] {
  const issues: string[] = [];
  if (!obj || typeof obj !== 'object') return issues;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (key === 'color' && (value === undefined || value === null || value === '')) {
      const issue = `⚠️ UNDEFINED COLOR FOUND at ${currentPath}: ${value}`;
      console.warn(issue);
      issues.push(issue);
    }
    
    if (key === 'colorStops' && Array.isArray(value)) {
      value.forEach((stop: any, index: number) => {
        if (stop && (stop.color === undefined || stop.color === null || stop.color === '')) {
          const issue = `⚠️ UNDEFINED COLOR IN COLORSTOPS at ${currentPath}[${index}]: ${JSON.stringify(stop)}`;
          console.warn(issue);
          issues.push(issue);
        }
      });
    }
    
    if (typeof value === 'object') {
      issues.push(...scanForUndefinedColors(value, currentPath));
    }
  }
  
  return issues;
}

// Export a hook for React components
export function useGradientDebug(componentName: string) {
  useEffect(() => {
    const cleanup = trackComponentRender(componentName);
    return cleanup;
  }, [componentName]);
}
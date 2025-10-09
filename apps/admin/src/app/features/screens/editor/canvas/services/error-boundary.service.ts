import { Injectable } from '@angular/core';
import { ComponentItem, ComponentErrorInfo } from '../../models/component.model';

@Injectable({
  providedIn: 'root'
})
export class ErrorBoundaryService {
  private errorLog: Map<string, ComponentErrorInfo[]> = new Map();

  captureError(
    component: ComponentItem,
    error: Error,
    phase: ComponentErrorInfo['phase']
  ): ComponentErrorInfo {
    const errorInfo: ComponentErrorInfo = {
      message: error.message || '未知错误',
      stack: error.stack,
      timestamp: Date.now(),
      phase
    };

    if (!this.errorLog.has(component.id)) {
      this.errorLog.set(component.id, []);
    }
    this.errorLog.get(component.id)!.push(errorInfo);

    this.logError(component, errorInfo);

    return errorInfo;
  }

  clearError(componentId: string): void {
    this.errorLog.delete(componentId);
  }

  getErrorHistory(componentId: string): ComponentErrorInfo[] {
    return this.errorLog.get(componentId) || [];
  }

  hasError(componentId: string): boolean {
    return this.errorLog.has(componentId) && this.errorLog.get(componentId)!.length > 0;
  }

  getLatestError(componentId: string): ComponentErrorInfo | undefined {
    const errors = this.errorLog.get(componentId);
    return errors && errors.length > 0 ? errors[errors.length - 1] : undefined;
  }

  private logError(component: ComponentItem, errorInfo: ComponentErrorInfo): void {
    const errorMsg = `[ErrorBoundary] 组件 [${component.type}#${component.id}] ${this.getPhaseText(errorInfo.phase)}: ${errorInfo.message}`;
    console.error(errorMsg);

    if (errorInfo.stack) {
      console.error('错误堆栈:', errorInfo.stack);
    }
  }

  private getPhaseText(phase: ComponentErrorInfo['phase']): string {
    const phaseMap: Record<ComponentErrorInfo['phase'], string> = {
      init: '初始化异常',
      render: '渲染异常',
      data: '数据异常',
      unknown: '未知异常'
    };
    return phaseMap[phase] || '未知异常';
  }

  exportErrorReport(): string {
    const report: any = {
      timestamp: new Date().toISOString(),
      totalErrors: Array.from(this.errorLog.values()).reduce((sum, errors) => sum + errors.length, 0),
      components: []
    };

    this.errorLog.forEach((errors, componentId) => {
      report.components.push({
        componentId,
        errorCount: errors.length,
        errors: errors.map(err => ({
          message: err.message,
          phase: err.phase,
          timestamp: new Date(err.timestamp).toISOString()
        }))
      });
    });

    return JSON.stringify(report, null, 2);
  }
}

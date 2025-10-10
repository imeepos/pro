import { Injectable } from '@angular/core';
import { CanvasQuery } from './canvas.query';
import { CanvasService } from './canvas.service';
import { ComponentItem } from '../../models/component.model';

export interface ExportData {
  version: string;
  id: string;
  name: string;
  createTime: number;
  updateTime: number;
  canvasStyle: {
    width: number;
    height: number;
    background: string | any;
    className?: string;
    dataAttrs?: Record<string, string>;
    description?: string;
  };
  componentData: ComponentItem[];
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

@Injectable({ providedIn: 'root' })
export class ImportExportService {
  private readonly EXPORT_VERSION = '1.0.0';
  private readonly SUPPORTED_VERSIONS = ['1.0.0'];

  constructor(
    private canvasQuery: CanvasQuery,
    private canvasService: CanvasService
  ) {}

  exportCanvas(screenName: string = '大屏项目'): void {
    const state = this.canvasQuery.getValue();
    const timestamp = Date.now();

    const exportData: ExportData = {
      version: this.EXPORT_VERSION,
      id: `export_${timestamp}`,
      name: screenName,
      createTime: timestamp,
      updateTime: timestamp,
      canvasStyle: {
        width: state.canvasStyle.width,
        height: state.canvasStyle.height,
        background: state.canvasStyle.background,
        className: state.canvasStyle.className,
        dataAttrs: state.canvasStyle.dataAttrs,
        description: state.canvasStyle.description
      },
      componentData: state.componentData
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `${this.sanitizeFileName(screenName)}_${timestamp}.json`;

    this.downloadFile(fileName, jsonString);
  }

  importCanvas(onSuccess?: () => void, onError?: (error: string) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;

      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      const reader = new FileReader();

      reader.onload = (loadEvent: ProgressEvent<FileReader>) => {
        try {
          const result = loadEvent.target?.result;
          if (!result || typeof result !== 'string') {
            throw new Error('无法读取文件内容');
          }

          const data = JSON.parse(result);
          const validation = this.validateImportData(data);

          if (!validation.valid) {
            if (onError) {
              onError(validation.error || '数据验证失败');
            }
            return;
          }

          this.applyImportData(data);

          if (onSuccess) {
            onSuccess();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '导入失败';
          if (onError) {
            onError(errorMessage);
          }
        }
      };

      reader.onerror = () => {
        if (onError) {
          onError('文件读取失败');
        }
      };

      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  private validateImportData(data: any): ImportValidationResult {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: '无效的JSON格式' };
    }

    if (!data.version) {
      return { valid: false, error: '缺少版本信息' };
    }

    if (!this.SUPPORTED_VERSIONS.includes(data.version)) {
      return {
        valid: false,
        error: `不支持的版本：${data.version}，支持的版本：${this.SUPPORTED_VERSIONS.join(', ')}`
      };
    }

    if (!data.canvasStyle) {
      return { valid: false, error: '缺少画布样式数据' };
    }

    if (!Array.isArray(data.componentData)) {
      return { valid: false, error: '组件数据格式错误' };
    }

    const requiredStyleFields = ['width', 'height', 'background'];
    const missingFields = requiredStyleFields.filter(field => !(field in data.canvasStyle));

    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `画布样式缺少必需字段：${missingFields.join(', ')}`
      };
    }

    return { valid: true };
  }

  private applyImportData(data: ExportData): void {
    this.canvasService.clearCanvas();

    this.canvasService.updateCanvasStyle({
      width: data.canvasStyle.width,
      height: data.canvasStyle.height,
      background: data.canvasStyle.background,
      className: data.canvasStyle.className,
      dataAttrs: data.canvasStyle.dataAttrs,
      description: data.canvasStyle.description
    });

    data.componentData.forEach((component: ComponentItem) => {
      this.canvasService.addComponent(component);
    });
  }

  private downloadFile(fileName: string, content: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
      .substring(0, 50);
  }
}

import {
  LayoutConfig,
  ScreenComponent,
} from '@pro/entities';
import {
  LayoutConfigDto,
  ScreenComponentDto,
  GridConfigDto,
} from '../dto/screen-config.dto';

/**
 * 屏幕数据转换工具类
 * 处理前端格式与实体格式之间的转换
 */
export class ScreenDataTransformer {
  /**
   * 将前端布局配置转换为实体格式
   * 直接使用像素单位设置画布尺寸
   */
  static transformLayoutConfig(layoutDto: LayoutConfigDto): LayoutConfig {
    // 向后兼容：如果传入的是栅格格式，转换为像素
    if (layoutDto.cols && layoutDto.rows) {
      const gridPixelSize = 50;
      return {
        width: Math.round(layoutDto.cols * gridPixelSize),
        height: Math.round(layoutDto.rows * gridPixelSize),
        background: layoutDto.background || '#ffffff',
        grid: {
          enabled: true,
          size: gridPixelSize,
        },
      };
    }

    // 使用新的像素单位格式
    return {
      width: Math.round(layoutDto.width || 1920),
      height: Math.round(layoutDto.height || 1080),
      background: layoutDto.background || '#ffffff',
      grid: {
        enabled: layoutDto.grid?.enabled || false,
        size: Math.round(layoutDto.grid?.size || 50),
      },
    };
  }

  /**
   * 将前端组件配置转换为实体格式
   */
  static transformScreenComponent(componentDto: ScreenComponentDto): ScreenComponent {
    return {
      id: componentDto.id,
      type: componentDto.type,
      position: {
        x: Math.round(componentDto.position.x),
        y: Math.round(componentDto.position.y),
        width: Math.round(componentDto.position.width),
        height: Math.round(componentDto.position.height),
        zIndex: Math.round(componentDto.position.zIndex),
      },
      config: componentDto.config || {},
      dataSource: componentDto.dataSource ? {
        type: componentDto.dataSource.type,
        url: componentDto.dataSource.url,
        data: componentDto.dataSource.data,
        refreshInterval: componentDto.dataSource.refreshInterval,
      } : undefined,
    };
  }

  /**
   * 将实体布局配置转换为前端友好的格式
   * 返回像素格式，同时提供向后兼容的栅格信息
   */
  static transformLayoutConfigToFrontend(layout: LayoutConfig): LayoutConfig & { cols?: number; rows?: number } {
    const result: LayoutConfig & { cols?: number; rows?: number } = {
      ...layout,
    };

    // 向后兼容：计算栅格信息（仅用于显示）
    if (layout.grid && layout.grid.enabled) {
      const gridSize = layout.grid.size || 50;
      result.cols = Math.round(layout.width / gridSize);
      result.rows = Math.round(layout.height / gridSize);
    }

    return result;
  }

  /**
   * 将实体组件配置转换为前端格式
   */
  static transformScreenComponentToFrontend(component: ScreenComponent): ScreenComponentDto {
    return {
      id: component.id,
      type: component.type,
      position: {
        x: Math.round(component.position.x),
        y: Math.round(component.position.y),
        width: Math.round(component.position.width),
        height: Math.round(component.position.height),
        zIndex: Math.round(component.position.zIndex),
      },
      config: component.config || {},
      dataSource: component.dataSource ? {
        type: component.dataSource.type,
        url: component.dataSource.url,
        data: component.dataSource.data,
        refreshInterval: component.dataSource.refreshInterval,
      } : undefined,
    };
  }
}
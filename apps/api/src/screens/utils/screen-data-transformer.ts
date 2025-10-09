import {
  LayoutConfig,
  ScreenComponent,
} from '../../entities/screen-page.entity';
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
   * 前端格式：{cols: 24, rows: 24}
   * 实体格式：{width: number, height: number, background: string, grid?: GridConfigDto}
   */
  static transformLayoutConfig(layoutDto: LayoutConfigDto): LayoutConfig {
    // 如果是前端格式（cols/rows），转换为实体格式
    if (layoutDto.cols && layoutDto.rows) {
      // 每个格子默认50px
      const gridPixelSize = 50;

      return {
        width: layoutDto.cols * gridPixelSize,
        height: layoutDto.rows * gridPixelSize,
        background: layoutDto.background || '#ffffff',
        grid: {
          enabled: true,
          size: gridPixelSize,
        },
      };
    }

    // 如果已经是实体格式，直接返回
    return {
      width: layoutDto.width || 1200,
      height: layoutDto.height || 800,
      background: layoutDto.background || '#ffffff',
      grid: {
        enabled: layoutDto.grid?.enabled || false,
        size: layoutDto.grid?.size || 50,
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
        x: componentDto.position.x,
        y: componentDto.position.y,
        width: componentDto.position.width,
        height: componentDto.position.height,
        zIndex: componentDto.position.zIndex,
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
   * 包含原始实体格式和计算出的cols/rows信息
   */
  static transformLayoutConfigToFrontend(layout: LayoutConfig): LayoutConfig & { cols?: number; rows?: number } {
    const result: LayoutConfig & { cols?: number; rows?: number } = {
      ...layout,
    };

    // 如果有网格信息，计算cols和rows
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
        x: component.position.x,
        y: component.position.y,
        width: component.position.width,
        height: component.position.height,
        zIndex: component.position.zIndex,
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
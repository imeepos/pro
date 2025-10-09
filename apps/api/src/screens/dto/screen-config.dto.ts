import {
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 网格配置DTO
 */
export class GridConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number;
}

/**
 * 布局配置DTO
 * 支持两种格式：
 * 1. 前端格式：{cols: number, rows: number}
 * 2. 实体格式：{width: number, height: number, background: string, grid?: GridConfigDto}
 */
export class LayoutConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  cols?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rows?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  height?: number;

  @IsOptional()
  @IsString()
  background?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GridConfigDto)
  grid?: GridConfigDto;
}

/**
 * 组件位置配置DTO
 */
export class ComponentPositionDto {
  @IsNumber()
  @Min(0)
  x: number;

  @IsNumber()
  @Min(0)
  y: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;

  @IsNumber()
  @Min(0)
  zIndex: number;
}

/**
 * 组件数据源配置DTO
 */
export class ComponentDataSourceDto {
  @IsString()
  type: 'api' | 'static';

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  refreshInterval?: number;
}

/**
 * 屏幕组件DTO
 */
export class ScreenComponentDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ComponentPositionDto)
  position: ComponentPositionDto;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ComponentDataSourceDto)
  dataSource?: ComponentDataSourceDto;
}
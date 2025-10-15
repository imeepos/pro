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
import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

export enum ScreenComponentDataSourceEnum {
  API = 'api',
  STATIC = 'static',
}

export type ScreenComponentDataSourceType = `${ScreenComponentDataSourceEnum}`;

registerEnumType(ScreenComponentDataSourceEnum, {
  name: 'ScreenComponentDataSourceType',
  description: '屏幕组件数据源类型',
});

/**
 * 网格配置DTO
 */
@InputType('ScreenGridInput')
export class GridConfigDto {
  @IsOptional()
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Field(() => Int, { nullable: true, description: '网格尺寸，单位为像素' })
  size?: number;
}

/**
 * 布局配置DTO
 * 使用像素单位设置画布尺寸
 */
@InputType('ScreenLayoutInput')
export class LayoutConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(10000)
  @Field(() => Int, { nullable: true, description: '画布宽度，单位像素' })
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(600)
  @Max(10000)
  @Field(() => Int, { nullable: true, description: '画布高度，单位像素' })
  height?: number;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  background?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GridConfigDto)
  @Field(() => GridConfigDto, { nullable: true })
  grid?: GridConfigDto;

  // 向后兼容：保留栅格字段但标记为废弃
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    deprecationReason: '请使用 width + grid.size 表达列数',
  })
  cols?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Field(() => Int, {
    nullable: true,
    deprecationReason: '请使用 height + grid.size 表达行数',
  })
  rows?: number;
}

/**
 * 组件位置配置DTO
 */
@InputType('ScreenComponentPositionInput')
export class ComponentPositionDto {
  @IsNumber()
  @Min(0)
  @Field(() => Int)
  x: number;

  @IsNumber()
  @Min(0)
  @Field(() => Int)
  y: number;

  @IsNumber()
  @Min(1)
  @Field(() => Int)
  width: number;

  @IsNumber()
  @Min(1)
  @Field(() => Int)
  height: number;

  @IsNumber()
  @Min(0)
  @Field(() => Int)
  zIndex: number;
}

/**
 * 组件数据源配置DTO
 */
@InputType('ScreenComponentDataSourceInput')
export class ComponentDataSourceDto {
  @IsString()
  @Field(() => ScreenComponentDataSourceEnum)
  type: ScreenComponentDataSourceType;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  url?: string;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Field(() => Int, {
    nullable: true,
    description: '刷新频率，单位毫秒',
  })
  refreshInterval?: number;
}

/**
 * 屏幕组件DTO
 */
@InputType('ScreenComponentInput')
export class ScreenComponentDto {
  @IsString()
  @Field(() => String)
  id: string;

  @IsString()
  @Field(() => String)
  type: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ComponentPositionDto)
  @Field(() => ComponentPositionDto)
  position: ComponentPositionDto;

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Field(() => GraphQLJSONObject, { nullable: true })
  config?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ComponentDataSourceDto)
  @Field(() => ComponentDataSourceDto, { nullable: true })
  dataSource?: ComponentDataSourceDto;
}

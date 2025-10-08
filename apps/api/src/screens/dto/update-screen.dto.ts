import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LayoutConfig,
  ScreenComponent,
} from '../../entities/screen-page.entity';

export class UpdateScreenDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  layout?: LayoutConfig;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  components?: ScreenComponent[];
}

import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LayoutConfigDto,
  ScreenComponentDto,
} from './screen-config.dto';

export class CreateScreenDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LayoutConfigDto)
  layout: LayoutConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScreenComponentDto)
  components?: ScreenComponentDto[];
}

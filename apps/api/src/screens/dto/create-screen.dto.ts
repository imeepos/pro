import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Field, InputType } from '@nestjs/graphql';
import {
  LayoutConfigDto,
  ScreenComponentDto,
} from './screen-config.dto';

@InputType('CreateScreenInput')
export class CreateScreenDto {
  @IsString()
  @Field(() => String)
  name: string;

  @IsOptional()
  @IsString()
  @Field(() => String, { nullable: true })
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LayoutConfigDto)
  @Field(() => LayoutConfigDto)
  layout: LayoutConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScreenComponentDto)
  @Field(() => [ScreenComponentDto], { nullable: true })
  components?: ScreenComponentDto[];
}

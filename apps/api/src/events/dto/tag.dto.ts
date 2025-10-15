import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const HEX_COLOR_MESSAGE = 'tagColor must be a valid hex color (e.g., #1890ff)';

@InputType('CreateTagInput')
export class CreateTagDto {
  @IsString()
  @MaxLength(50)
  @Field(() => String)
  tagName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(HEX_COLOR_PATTERN, {
    message: HEX_COLOR_MESSAGE,
  })
  @Field(() => String, { nullable: true })
  tagColor?: string;
}

@InputType('UpdateTagInput')
export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Field(() => String, { nullable: true })
  tagName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(HEX_COLOR_PATTERN, {
    message: HEX_COLOR_MESSAGE,
  })
  @Field(() => String, { nullable: true })
  tagColor?: string;
}

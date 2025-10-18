import { IsString, IsOptional, IsInt, IsEnum, MaxLength } from 'class-validator';
import { Field, InputType, Int } from '@nestjs/graphql';
import { MediaTypeStatus } from '@pro/types';

@InputType('CreateMediaTypeInput')
export class CreateMediaTypeDto {
  @IsString()
  @MaxLength(50)
  @Field(() => String)
  typeCode: string;

  @IsString()
  @MaxLength(100)
  @Field(() => String)
  typeName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Field(() => String, { nullable: true })
  description?: string;

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  sort?: number;

  @IsOptional()
  @IsEnum(MediaTypeStatus)
  @Field(() => MediaTypeStatus, { nullable: true })
  status?: MediaTypeStatus;
}
